export interface ScriptRuntimeMetadata {
  projectPath: string;
  projectName: string;
  workspacePath: string;
  workspaceRelativePath: string;
  workspaceName: string;
  scriptName: string;
}

const SCRIPT_RUNTIME_METADATA_CONFIG = {
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

export type ScriptRuntimeMetadataKey =
  keyof typeof SCRIPT_RUNTIME_METADATA_CONFIG;

export const getScriptRuntimeMetadataConfig = (key: ScriptRuntimeMetadataKey) =>
  SCRIPT_RUNTIME_METADATA_CONFIG[key];
