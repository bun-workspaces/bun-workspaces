import type {
  WorkspaceConfig,
  WorkspaceDependenciesRule,
  WorkspaceRules,
} from "bw-common/config";
import { resolveOptionalArray } from "../../internal/core";

const uniqueArray = <T>(arr: T[]): T[] => [...new Set(arr)];

const concatPatterns = (
  a: string[] | undefined,
  b: string[] | undefined,
): string[] | undefined => {
  if (!a?.length && !b?.length) return undefined;
  return uniqueArray([...(a ?? []), ...(b ?? [])]);
};

const mergeWorkspaceDependenciesRule = (
  base: WorkspaceDependenciesRule | undefined,
  override: WorkspaceDependenciesRule | undefined,
): WorkspaceDependenciesRule | undefined => {
  if (!base && !override) return undefined;
  const allowPatterns = concatPatterns(
    base?.allowPatterns,
    override?.allowPatterns,
  );
  const denyPatterns = concatPatterns(
    base?.denyPatterns,
    override?.denyPatterns,
  );
  return {
    ...(allowPatterns && { allowPatterns }),
    ...(denyPatterns && { denyPatterns }),
  };
};

const mergeWorkspaceRules = (
  base: WorkspaceRules | undefined,
  override: WorkspaceRules | undefined,
): WorkspaceRules => {
  const workspaceDependencies = mergeWorkspaceDependenciesRule(
    base?.workspaceDependencies,
    override?.workspaceDependencies,
  );
  return {
    ...(workspaceDependencies && { workspaceDependencies }),
  };
};

const mergeScripts = (
  base: WorkspaceConfig["scripts"],
  override: WorkspaceConfig["scripts"],
): WorkspaceConfig["scripts"] => {
  if (!base && !override) return {};
  if (!base) return override ?? {};
  if (!override) return base;

  const merged = { ...base };
  for (const [key, value] of Object.entries(override)) {
    merged[key] = base[key] ? { ...base[key], ...value } : value;
  }
  return merged;
};

/** Merge two or more workspace configs left to right, with each subsequent config taking precedence */
export const mergeWorkspaceConfig = (
  ...configs: WorkspaceConfig[]
): WorkspaceConfig =>
  configs.reduce<WorkspaceConfig>(
    (acc, config) => ({
      alias: uniqueArray([
        ...resolveOptionalArray(acc.alias ?? []),
        ...resolveOptionalArray(config.alias ?? []),
      ]),
      tags: uniqueArray([...(acc.tags ?? []), ...(config.tags ?? [])]),
      scripts: mergeScripts(acc.scripts, config.scripts),
      rules: mergeWorkspaceRules(acc.rules, config.rules),
    }),
    {},
  );
