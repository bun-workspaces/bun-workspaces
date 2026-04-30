import path from "path";
import bun from "bun";
import type { Workspace } from "../workspace";

export interface AffectedWorkspaceInput {
  workspace: Workspace;
  /** File paths, directories, or glob patterns relative to the workspace's path */
  inputPatterns: string[];
}
export interface AffectedFileResult {
  /** The path to the file in the workspace */
  filePath: string;
  /** The matched input path of the file */
  inputPattern: string;
}

export interface AffectedDependencyResult {
  dependencyName: string;
  /** The chain of dependencies that led to the affected file */
  chain: string[];
}

export interface AffectedReasonMap {
  changedFiles: AffectedFileResult[];
  dependencies: AffectedDependencyResult[];
}

export interface AffectedWorkspaceResult {
  workspace: Workspace;
  isAffected: boolean;
  affectedReasons: AffectedReasonMap;
}

export interface GetAffectedWorkspacesOptions {
  /** For resolving relative workspace paths */
  rootDirectory: string;
  /** The workspaces and their given inputs */
  workspaceInputs: AffectedWorkspaceInput[];
  /** The paths of all files that are considered changed */
  changedFilePaths: string[];
  /** Whether to ignore dependencies when determining affected workspaces */
  ignoreDependencies?: boolean;
}

export interface GetAffectedWorkspacesResult {
  affectedWorkspaces: AffectedWorkspaceResult[];
}

const GLOB_CHARACTER_REGEX = /[*?[{]/;

const toPosixPath = (filePath: string) => filePath.replaceAll("\\", "/");

const stripTrailingSlashes = (filePath: string) => filePath.replace(/\/+$/, "");

const stripLeadingSlashes = (filePath: string) => filePath.replace(/^\/+/, "");

const normalizeChangedFilePath = ({
  rootDirectory,
  filePath,
}: {
  rootDirectory: string;
  filePath: string;
}) => {
  const posixFilePath = toPosixPath(filePath);
  if (!path.isAbsolute(filePath)) {
    return stripLeadingSlashes(posixFilePath);
  }
  const posixRoot = stripTrailingSlashes(toPosixPath(rootDirectory));
  if (posixFilePath === posixRoot) {
    return "";
  }
  if (posixRoot && posixFilePath.startsWith(`${posixRoot}/`)) {
    return posixFilePath.slice(posixRoot.length + 1);
  }
  return posixFilePath;
};

const resolveInputPattern = ({
  workspacePath,
  inputPattern,
}: {
  workspacePath: string;
  inputPattern: string;
}) => {
  const normalizedWorkspacePath = stripTrailingSlashes(
    toPosixPath(workspacePath),
  );
  const normalizedPattern = stripLeadingSlashes(
    stripTrailingSlashes(toPosixPath(inputPattern)),
  );

  if (!normalizedWorkspacePath || normalizedWorkspacePath === ".") {
    return normalizedPattern;
  }
  if (!normalizedPattern || normalizedPattern === ".") {
    return normalizedWorkspacePath;
  }
  return `${normalizedWorkspacePath}/${normalizedPattern}`;
};

const matchesResolvedPattern = ({
  filePath,
  resolvedPattern,
}: {
  filePath: string;
  resolvedPattern: string;
}): boolean => {
  if (!resolvedPattern) {
    return true;
  }
  if (GLOB_CHARACTER_REGEX.test(resolvedPattern)) {
    return new bun.Glob(resolvedPattern).match(filePath);
  }
  return (
    filePath === resolvedPattern || filePath.startsWith(`${resolvedPattern}/`)
  );
};

const matchChangedFilesForWorkspace = ({
  workspace,
  inputPatterns,
  changedFilePaths,
}: {
  workspace: Workspace;
  inputPatterns: string[];
  changedFilePaths: string[];
}): AffectedFileResult[] => {
  const matchedFiles: AffectedFileResult[] = [];
  const matchedFilePaths = new Set<string>();

  for (const filePath of changedFilePaths) {
    if (matchedFilePaths.has(filePath)) continue;

    for (const inputPattern of inputPatterns) {
      const resolvedPattern = resolveInputPattern({
        workspacePath: workspace.path,
        inputPattern,
      });
      if (matchesResolvedPattern({ filePath, resolvedPattern })) {
        matchedFiles.push({ filePath, inputPattern });
        matchedFilePaths.add(filePath);
        break;
      }
    }
  }

  return matchedFiles;
};

const collectAffectedDependencies = ({
  startingWorkspace,
  workspaceByName,
  hasChangedFiles,
}: {
  startingWorkspace: Workspace;
  workspaceByName: Map<string, Workspace>;
  hasChangedFiles: (workspaceName: string) => boolean;
}): AffectedDependencyResult[] => {
  const results: AffectedDependencyResult[] = [];
  const visited = new Set<string>([startingWorkspace.name]);

  const visit = (currentName: string, chain: string[]) => {
    const currentWorkspace = workspaceByName.get(currentName);
    if (!currentWorkspace) return;

    for (const dependencyName of currentWorkspace.dependencies) {
      if (visited.has(dependencyName)) continue;
      visited.add(dependencyName);

      const dependencyChain = [...chain, dependencyName];

      if (hasChangedFiles(dependencyName)) {
        results.push({ dependencyName, chain: dependencyChain });
      }

      visit(dependencyName, dependencyChain);
    }
  };

  visit(startingWorkspace.name, [startingWorkspace.name]);
  return results;
};

export const getAffectedWorkspaces = async ({
  rootDirectory,
  workspaceInputs,
  changedFilePaths,
  ignoreDependencies = false,
}: GetAffectedWorkspacesOptions): Promise<GetAffectedWorkspacesResult> => {
  const normalizedChangedFilePaths = changedFilePaths.map((filePath) =>
    normalizeChangedFilePath({ rootDirectory, filePath }),
  );

  const workspaceByName = new Map(
    workspaceInputs.map(
      ({ workspace }) => [workspace.name, workspace] as const,
    ),
  );

  const changedFilesByName = new Map<string, AffectedFileResult[]>();
  for (const { workspace, inputPatterns } of workspaceInputs) {
    changedFilesByName.set(
      workspace.name,
      matchChangedFilesForWorkspace({
        workspace,
        inputPatterns,
        changedFilePaths: normalizedChangedFilePaths,
      }),
    );
  }

  const hasChangedFiles = (workspaceName: string) =>
    (changedFilesByName.get(workspaceName)?.length ?? 0) > 0;

  const affectedWorkspaces = workspaceInputs.map(({ workspace }) => {
    const changedFiles = changedFilesByName.get(workspace.name) ?? [];
    const dependencies = ignoreDependencies
      ? []
      : collectAffectedDependencies({
          startingWorkspace: workspace,
          workspaceByName,
          hasChangedFiles,
        });

    return {
      workspace,
      isAffected: changedFiles.length > 0 || dependencies.length > 0,
      affectedReasons: { changedFiles, dependencies },
    };
  });

  return { affectedWorkspaces };
};
