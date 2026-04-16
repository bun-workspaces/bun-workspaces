import {
  type WorkspaceConfig,
  type ResolvedWorkspaceConfig,
} from "bw-common/config";
import { resolveWorkspaceConfig } from "./workspaceConfig";

export const defineWorkspaceConfig = (
  config: WorkspaceConfig,
): ResolvedWorkspaceConfig => {
  if (Array.isArray((config as ResolvedWorkspaceConfig).aliases)) {
    const { aliases, ...rest } = config as ResolvedWorkspaceConfig;
    return resolveWorkspaceConfig({
      ...rest,
      alias: aliases,
    });
  }
  return resolveWorkspaceConfig(config);
};
