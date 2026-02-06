import type { ResolvedWorkspaceConfig } from "../../config";
import type { ResolvedPackageJsonContent } from "../packageJson";
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
): Workspace[] => {
  const workspacePackages = Object.values(workspaceMap).filter(
    ({ workspace }) => includeRootWorkspace || !workspace.isRoot,
  );

  const workspacesWithDependencies = workspacePackages.map(
    ({ workspace, packageJson }) => {
      for (const dependencyMap of [
        packageJson.dependencies,
        packageJson.devDependencies,
        packageJson.peerDependencies,
        packageJson.optionalDependencies,
      ]) {
        for (const [dependencyName, dependencyVersion] of Object.entries(
          dependencyMap,
        )) {
          if (
            dependencyVersion.startsWith("workspace:") &&
            workspaceMap[dependencyName]
          ) {
            workspace.dependsOn.push(dependencyName);
            workspaceMap[dependencyName].workspace.dependents.push(
              workspace.name,
            );
          }
        }
      }
      return workspace;
    },
  );

  return workspacesWithDependencies.map((workspace) => {
    workspace.dependsOn = [...new Set(workspace.dependsOn)].sort();
    workspace.dependents = [...new Set(workspace.dependents)].sort();
    return workspace;
  });
};
