import {
  resolveWorkspaceConfig,
  type WorkspaceConfig as JSONSchemaWorkspaceConfig,
  type ResolvedWorkspaceConfig,
  type WorkspaceConfig,
} from "./workspaceConfig";

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
