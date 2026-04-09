import { matchWorkspacesByPatterns } from "../workspacePattern";
import { WORKSPACE_ERRORS } from "../errors";
import type { WorkspaceMap } from "./resolveDependencies";

type DepEntry = {
  name: string;
  chain: string[];
};

const getTransitiveDeps = (
  workspaceName: string,
  workspaceMap: WorkspaceMap,
  chain: string[],
  visited: Set<string>,
): DepEntry[] => {
  const entry = workspaceMap[workspaceName];
  if (!entry) return [];

  const result: DepEntry[] = [];

  for (const depName of entry.workspace.dependencies) {
    const depChain = [...chain, depName];
    result.push({ name: depName, chain: depChain });

    if (!visited.has(depName)) {
      visited.add(depName);
      result.push(...getTransitiveDeps(depName, workspaceMap, depChain, visited));
    }
  }

  return result;
};

export type ValidateWorkspaceDependencyRulesOptions = {
  workspaceMap: WorkspaceMap;
};

export const validateWorkspaceDependencyRules = ({
  workspaceMap,
}: ValidateWorkspaceDependencyRulesOptions): void => {
  for (const [workspaceName, { config }] of Object.entries(workspaceMap)) {
    const rule = config.rules?.workspaceDependencies;
    if (!rule?.allowPatterns && !rule?.denyPatterns) continue;

    const transitiveDeps = getTransitiveDeps(
      workspaceName,
      workspaceMap,
      [workspaceName],
      new Set([workspaceName]),
    );

    for (const { name: depName, chain } of transitiveDeps) {
      const depWorkspace = workspaceMap[depName]?.workspace;
      if (!depWorkspace) continue;

      const chainStr = chain.join(" -> ");

      if (rule.denyPatterns) {
        const isDenied =
          matchWorkspacesByPatterns(rule.denyPatterns, [depWorkspace]).length >
          0;
        if (isDenied) {
          throw new WORKSPACE_ERRORS.DependencyRuleViolation(
            `Workspace "${workspaceName}" violates workspaceDependencies rule: workspace "${depName}" is denied by denyPatterns (dependency chain: ${chainStr})`,
          );
        }
      }

      if (rule.allowPatterns) {
        const isAllowed =
          matchWorkspacesByPatterns(rule.allowPatterns, [depWorkspace]).length >
          0;
        if (!isAllowed) {
          throw new WORKSPACE_ERRORS.DependencyRuleViolation(
            `Workspace "${workspaceName}" violates workspaceDependencies rule: workspace "${depName}" is not permitted by allowPatterns (dependency chain: ${chainStr})`,
          );
        }
      }
    }
  }
};
