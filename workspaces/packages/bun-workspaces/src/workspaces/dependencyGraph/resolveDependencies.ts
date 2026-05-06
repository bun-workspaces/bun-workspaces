import type { ResolvedWorkspaceConfig } from "bw-common/config";
import {
  resolveCatalogDependencyVersion,
  type BunCatalogSet,
  type ResolvedPackageJsonContent,
} from "../packageJson";
import type { Workspace } from "../workspace";

export type WorkspaceMap = {
  [workspaceName: string]: {
    workspace: Workspace;
    config: ResolvedWorkspaceConfig;
    packageJson: ResolvedPackageJsonContent;
  };
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
      const externalDevOnly = new Map<string, boolean>();
      const dependencyMaps: { map: Record<string, string>; isDev: boolean }[] =
        [
          { map: packageJson.dependencies, isDev: false },
          { map: packageJson.devDependencies, isDev: true },
          { map: packageJson.peerDependencies, isDev: false },
          { map: packageJson.optionalDependencies, isDev: false },
        ];
      for (const { map, isDev } of dependencyMaps) {
        for (const [dependencyName, dependencyVersion] of Object.entries(map)) {
          const resolvedVersion =
            catalogs && dependencyVersion.startsWith("catalog:")
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
          const existingDevOnly = externalDevOnly.get(dependencyName);
          if (existingDevOnly === undefined) {
            externalDevOnly.set(dependencyName, isDev);
          } else if (existingDevOnly && !isDev) {
            externalDevOnly.set(dependencyName, false);
          }
        }
      }
      workspace.externalDependencies = [...externalDevOnly.entries()]
        .map(([name, dev]) => ({ name, dev }))
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
