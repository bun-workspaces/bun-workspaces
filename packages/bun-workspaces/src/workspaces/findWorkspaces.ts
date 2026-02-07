import fs from "fs";
import path from "path";
import bun from "bun";
import {
  createDefaultWorkspaceConfig,
  loadWorkspaceConfig,
  type ProjectConfig,
  type ResolvedWorkspaceConfig,
} from "../config";
import { BUN_LOCK_ERRORS, readBunLockfile } from "../internal/bun";
import { BunWorkspacesError } from "../internal/core";
import {
  resolveWorkspaceDependencies,
  type WorkspaceMap,
} from "./dependencyGraph/resolveDependencies";
import { WORKSPACE_ERRORS } from "./errors";
import {
  resolvePackageJsonContent,
  resolvePackageJsonPath,
} from "./packageJson";
import type { Workspace } from "./workspace";

export interface FindWorkspacesOptions {
  rootDirectory: string;
  /** If provided, will override the workspaces found in the package.json. Mainly for testing purposes */
  workspaceGlobs?: string[];
  /** @deprecated due to config file changes */
  workspaceAliases?: ProjectConfig["workspaceAliases"];
  /** Whether to include the root workspace as a normal workspace.*/
  includeRootWorkspace?: boolean;
}

export const sortWorkspaces = (workspaces: Workspace[]) =>
  [...workspaces]
    .sort((a, b) =>
      a.isRoot
        ? -1
        : a.path.localeCompare(b.path) || a.name.localeCompare(b.name),
    )
    .reduce<Workspace[]>((acc, workspace, i, arr) => {
      const previousWorkspace = arr[i - 1];
      if (previousWorkspace && previousWorkspace.path === workspace.path) {
        return acc;
      }
      return [...acc, workspace];
    }, []);

const getWorkspaceGlobsFromRoot = ({
  rootDirectory,
}: {
  rootDirectory: string;
}) => {
  const packageJsonPath = path.join(rootDirectory, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    throw new WORKSPACE_ERRORS.PackageNotFound(
      `No package.json found for project root at ${packageJsonPath}`,
    );
  }

  const packageJson = resolvePackageJsonContent(
    packageJsonPath,
    rootDirectory,
    ["workspaces"],
  );

  return packageJson.workspaces ?? [];
};

const validateWorkspace = (workspace: Workspace, workspaces: Workspace[]) => {
  if (workspaces.find((ws) => ws.path === workspace.path)) {
    return false;
  }

  if (workspaces.find((ws) => ws.name === workspace.name)) {
    throw new WORKSPACE_ERRORS.DuplicateWorkspaceName(
      `Duplicate workspace name found: ${JSON.stringify(workspace.name)}`,
    );
  }

  return true;
};

export const findWorkspaces = ({
  rootDirectory,
  workspaceGlobs: _workspaceGlobs,
  workspaceAliases = {},
  includeRootWorkspace = false,
}: FindWorkspacesOptions) => {
  rootDirectory = path.resolve(rootDirectory);

  let workspaces: Workspace[] = [];

  const workspaceMap: WorkspaceMap = {};

  const bunLock = readBunLockfile(rootDirectory);

  if (bunLock instanceof BunWorkspacesError) {
    if (bunLock instanceof BUN_LOCK_ERRORS.BunLockNotFound) {
      bunLock.message =
        `No bun.lock found at ${rootDirectory}. Check that this is the directory of your project and that you've ran 'bun install'.` +
        " If you have ran 'bun install', you may simply have no workspaces or dependencies in your project.";
    }
    throw bunLock;
  }

  const workspaceGlobs =
    _workspaceGlobs ?? getWorkspaceGlobsFromRoot({ rootDirectory });

  let rootWorkspace: Workspace | undefined;

  for (const workspacePath of Object.keys(bunLock.workspaces).map((p) =>
    path.join(rootDirectory, p),
  )) {
    const packageJsonPath = resolvePackageJsonPath(workspacePath);
    if (packageJsonPath) {
      const packageJsonContent = resolvePackageJsonContent(
        packageJsonPath,
        rootDirectory,
        ["name", "scripts"],
      );

      const workspaceConfig = loadWorkspaceConfig(
        path.dirname(packageJsonPath),
      );

      if (workspaceConfig) {
        for (const alias of workspaceConfig.aliases) {
          workspaceAliases[alias] = packageJsonContent.name;
        }
      }

      const relativePath = path.relative(
        rootDirectory,
        path.dirname(packageJsonPath),
      );

      const matchPattern =
        workspaceGlobs.find((glob) => new bun.Glob(glob).match(relativePath)) ??
        "";

      const workspace: Workspace = {
        name: packageJsonContent.name ?? "",
        isRoot: workspacePath === rootDirectory,
        matchPattern: workspacePath === rootDirectory ? "" : matchPattern,
        path: path.relative(rootDirectory, path.dirname(packageJsonPath)),
        scripts: Object.keys(packageJsonContent.scripts ?? {}).sort(),
        aliases: [
          ...new Set(
            Object.entries(workspaceAliases ?? {})
              .filter(([_, value]) => value === packageJsonContent.name)
              .map(([key]) => key)
              .concat(workspaceConfig?.aliases ?? []),
          ),
        ],
        dependencies: [],
        dependents: [],
      };

      if (workspace.isRoot) {
        rootWorkspace = workspace;
      }

      if (validateWorkspace(workspace, workspaces)) {
        if (!workspace.isRoot || includeRootWorkspace) {
          workspaces.push(workspace);
        }
        workspaceMap[workspace.name] = {
          workspace,
          config: workspaceConfig ?? createDefaultWorkspaceConfig(),
          packageJson: packageJsonContent,
        };
      }
    }
  }

  if (!rootWorkspace) {
    throw new WORKSPACE_ERRORS.RootWorkspaceNotFound("No root workspace found");
  }

  workspaces = sortWorkspaces(
    resolveWorkspaceDependencies(workspaceMap, includeRootWorkspace),
  );

  validateWorkspaceAliases(workspaces, workspaceAliases, rootWorkspace.name);

  return { workspaces, workspaceMap, rootWorkspace };
};

export const validateWorkspaceAliases = (
  workspaces: Workspace[],
  workspaceAliases: ProjectConfig["workspaceAliases"],
  rootWorkspaceName: string,
) => {
  for (const [alias, name] of Object.entries(workspaceAliases ?? {})) {
    if (workspaces.find((ws) => ws.name === alias)) {
      throw new WORKSPACE_ERRORS.AliasConflict(
        `Alias ${JSON.stringify(alias)} conflicts with workspace name ${JSON.stringify(name)}`,
      );
    }
    const workspaceWithDuplicateAlias = workspaces.find(
      (ws) => ws.name !== name && ws.aliases.includes(alias),
    );
    if (workspaceWithDuplicateAlias) {
      throw new WORKSPACE_ERRORS.AliasConflict(
        `Workspaces ${JSON.stringify(name)} and ${JSON.stringify(workspaceWithDuplicateAlias.name)} have the same alias ${JSON.stringify(alias)}`,
      );
    }
    if (
      !workspaces.find((ws) => ws.name === name) &&
      name !== rootWorkspaceName
    ) {
      throw new WORKSPACE_ERRORS.AliasedWorkspaceNotFound(
        `Workspace ${JSON.stringify(name)} was aliased by ${JSON.stringify(
          alias,
        )} but was not found`,
      );
    }
  }
};
