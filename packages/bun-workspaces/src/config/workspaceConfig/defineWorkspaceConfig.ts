import {
  resolveWorkspaceConfig,
  type ResolvedWorkspaceConfig,
  type WorkspaceConfig,
} from "./workspaceConfig";

export const defineWorkspaceConfig = (
  config: WorkspaceConfig,
): ResolvedWorkspaceConfig => resolveWorkspaceConfig(config);
