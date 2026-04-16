import { type ScriptShellOption } from "bw-common/parameters";
import {
  getScriptRuntimeMetadataConfig,
  type ScriptRuntimeMetadata,
  type ScriptRuntimeMetadataKey,
} from "bw-common/runScript";
import { IS_WINDOWS } from "../internal/core";

export const createScriptRuntimeEnvVars = (metadata: ScriptRuntimeMetadata) => {
  const keys = [
    "projectPath",
    "projectName",
    "workspacePath",
    "workspaceRelativePath",
    "scriptName",
    "workspaceName",
  ] as const satisfies ScriptRuntimeMetadataKey[];

  return keys.reduce(
    (acc, key) => {
      const { envVarName } = getScriptRuntimeMetadataConfig(key);
      acc[envVarName] = metadata[key];
      return acc;
    },
    {} as Record<string, string>,
  );
};

export const interpolateScriptRuntimeMetadata = (
  text: string,
  metadata: ScriptRuntimeMetadata,
  shell: ScriptShellOption,
) => {
  const keys = [
    "projectPath",
    "projectName",
    "workspacePath",
    "workspaceRelativePath",
    "scriptName",
    "workspaceName",
  ] as const satisfies ScriptRuntimeMetadataKey[];

  const inlineNames = keys.map(
    (key) => getScriptRuntimeMetadataConfig(key).inlineName,
  );

  return text.replace(new RegExp(inlineNames.join("|"), "g"), (match) => {
    const key = keys.find(
      (k) => getScriptRuntimeMetadataConfig(k).inlineName === match,
    );
    const value = metadata[key as ScriptRuntimeMetadataKey];
    if (IS_WINDOWS && shell === "bun") {
      return value.replace(/\\/g, "\\\\");
    }
    return value;
  });
};
