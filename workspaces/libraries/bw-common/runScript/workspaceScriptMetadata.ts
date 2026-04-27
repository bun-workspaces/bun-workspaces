export interface WorkspaceScriptMetadata {
  projectPath: string;
  projectName: string;
  workspacePath: string;
  workspaceRelativePath: string;
  workspaceName: string;
  scriptName: string;
}

const WORKSPACE_SCRIPT_METADATA_CONFIG = {
  projectPath: {
    inlineName: "<projectPath>",
    envVarName: "BW_PROJECT_PATH",
  },
  projectName: {
    inlineName: "<projectName>",
    envVarName: "BW_PROJECT_NAME",
  },
  workspacePath: {
    inlineName: "<workspacePath>",
    envVarName: "BW_WORKSPACE_PATH",
  },
  workspaceRelativePath: {
    inlineName: "<workspaceRelativePath>",
    envVarName: "BW_WORKSPACE_RELATIVE_PATH",
  },
  scriptName: {
    inlineName: "<scriptName>",
    envVarName: "BW_SCRIPT_NAME",
  },
  workspaceName: {
    inlineName: "<workspaceName>",
    envVarName: "BW_WORKSPACE_NAME",
  },
} as const;

export type WorkspaceScriptMetadataKey =
  keyof typeof WORKSPACE_SCRIPT_METADATA_CONFIG;

export const validateWorkspaceScriptMetadataKey = (key: string) => {
  if (!(key in WORKSPACE_SCRIPT_METADATA_CONFIG)) {
    throw new Error(`Invalid workspace script metadata key: ${key}`);
  }
};

export const getWorkspaceScriptMetadataConfig = (
  key: WorkspaceScriptMetadataKey,
) => {
  validateWorkspaceScriptMetadataKey(key);
  return WORKSPACE_SCRIPT_METADATA_CONFIG[key];
};
