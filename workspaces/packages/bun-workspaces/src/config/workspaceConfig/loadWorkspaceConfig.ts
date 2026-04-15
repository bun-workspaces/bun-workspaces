import { loadConfig } from "../util/loadConfig";
import {
  createDefaultWorkspaceConfig,
  resolveWorkspaceConfig,
  type WorkspaceConfig,
} from "./workspaceConfig";
import {
  WORKSPACE_CONFIG_FILE_NAME,
  WORKSPACE_CONFIG_PACKAGE_JSON_KEY,
} from "./workspaceConfigLocation";

export const loadWorkspaceConfig = (workspacePath: string) => {
  const config = loadConfig(
    "workspace",
    workspacePath,
    WORKSPACE_CONFIG_FILE_NAME,
    WORKSPACE_CONFIG_PACKAGE_JSON_KEY,
    (content) => resolveWorkspaceConfig(content as WorkspaceConfig),
  );
  return config ?? createDefaultWorkspaceConfig();
};
