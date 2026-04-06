import {
  resolveWorkspaceConfig,
  type WorkspaceConfig as JSONSchemaWorkspaceConfig,
  type ResolvedWorkspaceConfig,
  type ScriptConfig,
} from "./workspaceConfig";

export type WorkspaceConfig = {
  alias?: string | string[];
  scripts?: Record<string, ScriptConfig>;
};

export const defineWorkspaceConfig = (
  config: WorkspaceConfig,
): ResolvedWorkspaceConfig => {
  if (Array.isArray((config as ResolvedWorkspaceConfig).aliases)) {
    const { aliases, ...rest } = config as ResolvedWorkspaceConfig;
    return resolveWorkspaceConfig({
      ...rest,
      alias: aliases,
    } satisfies JSONSchemaWorkspaceConfig);
  }
  return resolveWorkspaceConfig(config satisfies JSONSchemaWorkspaceConfig);
};
