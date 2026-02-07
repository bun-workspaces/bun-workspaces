import { getScriptRuntimeMetadataConfig } from "./scriptRuntimeMetadata";

export const checkIsRecursiveScript = (
  workspaceName: string,
  scriptName: string,
) => {
  const parentWorkspace =
    process.env[getScriptRuntimeMetadataConfig("workspaceName").envVarName];
  const parentScript =
    process.env[getScriptRuntimeMetadataConfig("scriptName").envVarName];
  if (!parentWorkspace || !parentScript) {
    return false;
  }
  if (parentWorkspace === workspaceName && parentScript === scriptName) {
    return true;
  }
};
