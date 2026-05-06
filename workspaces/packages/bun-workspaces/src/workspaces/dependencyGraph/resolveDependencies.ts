import type { ResolvedWorkspaceConfig } from "bw-common/config";
import {
  resolveCatalogDependencyVersion,
  type BunCatalogSet,
  type ResolvedPackageJsonContent,
} from "../packageJson";
import type {
  ExternalDependency,
  ExternalDependencyCatalog,
  Workspace,
} from "../workspace";

export type WorkspaceMap = {
  [workspaceName: string]: {
    workspace: Workspace;
    config: ResolvedWorkspaceConfig;
    packageJson: ResolvedPackageJsonContent;
  };
};

type ExternalDependencyAccumulator = {
  dev: boolean;
  version: string;
  catalog?: ExternalDependencyCatalog;
};

const parseCatalogRef = (
  rawVersion: string,
): ExternalDependencyCatalog | undefined => {
  if (!rawVersion.startsWith("catalog:")) return undefined;
  return { name: rawVersion.slice("catalog:".length) };
};

export const resolveWorkspaceDependencies = (
  workspaceMap: WorkspaceMap,
  includeRootWorkspace: boolean,
  catalogs?: BunCatalogSet,
): Workspace[] => {
  const workspacePackages = Object.values(workspaceMap).filter(
    ({ workspace }) => includeRootWorkspace || !workspace.isRoot,
  );

  const workspacesWithDependencies = workspacePackages.map(
    ({ workspace, packageJson }) => {
      const externalAccumulator = new Map<
        string,
        ExternalDependencyAccumulator
      >();
      const dependencyMaps: { map: Record<string, string>; isDev: boolean }[] =
        [
          { map: packageJson.dependencies, isDev: false },
          { map: packageJson.devDependencies, isDev: true },
          { map: packageJson.peerDependencies, isDev: false },
          { map: packageJson.optionalDependencies, isDev: false },
        ];
      for (const { map, isDev } of dependencyMaps) {
        for (const [dependencyName, dependencyVersion] of Object.entries(map)) {
          const catalog = parseCatalogRef(dependencyVersion);
          const resolvedVersion =
            catalogs && catalog
              ? (resolveCatalogDependencyVersion(
                  dependencyName,
                  dependencyVersion,
                  catalogs,
                ) ?? dependencyVersion)
              : dependencyVersion;
          if (resolvedVersion.startsWith("workspace:")) {
            if (workspaceMap[dependencyName]) {
              workspace.dependencies.push(dependencyName);
              workspaceMap[dependencyName].workspace.dependents.push(
                workspace.name,
              );
            }
            continue;
          }
          // External dep — record. dev: true sticks unless we see a non-dev
          // entry for the same name (in which case it becomes runtime).
          // Version/catalog reflect the last entry seen for the name.
          const existing = externalAccumulator.get(dependencyName);
          if (!existing) {
            externalAccumulator.set(dependencyName, {
              dev: isDev,
              version: resolvedVersion,
              catalog,
            });
          } else {
            existing.version = resolvedVersion;
            existing.catalog = catalog;
            if (existing.dev && !isDev) existing.dev = false;
          }
        }
      }
      workspace.externalDependencies = [...externalAccumulator.entries()]
        .map(([name, { dev, version, catalog }]): ExternalDependency => {
          const entry: ExternalDependency = { name, version, dev };
          if (catalog) entry.catalog = catalog;
          return entry;
        })
        .sort((a, b) => a.name.localeCompare(b.name));
      return workspace;
    },
  );

  return workspacesWithDependencies.map((workspace) => {
    workspace.dependencies = [...new Set(workspace.dependencies)].sort();
    workspace.dependents = [...new Set(workspace.dependents)].sort();
    return workspace;
  });
};
