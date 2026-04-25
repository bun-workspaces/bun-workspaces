import { type ScriptShellOption } from "bw-common/parameters";
import {
  getScriptRuntimeMetadataConfig,
  type ScriptRuntimeMetadata,
  type ScriptRuntimeMetadataKey,
} from "bw-common/runScript";
import { BunWorkspacesError, IS_WINDOWS } from "../internal/core";

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

/**
 * This is a utility to run from a workspace's script that was called via `bun-workspaces`.
 *
 * It gets the value of some metadata value about the project, workspace, or script that was invoked.
 */
export const getWorkspaceScriptMetadata = (key: ScriptRuntimeMetadataKey) => {
  const { envVarName } = getScriptRuntimeMetadataConfig(key);
  if (!(envVarName in process.env)) {
    throw new BunWorkspacesError(
      `getScriptMetadata() called with key "${key}" but environment variable ${envVarName} is not set. getScriptMetadata() may not have been called in a workspace script running via bun-workspaces.`,
    );
  }
  return process.env[envVarName] as string;
};
