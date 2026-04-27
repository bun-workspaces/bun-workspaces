import { type ScriptShellOption } from "bw-common/parameters";
import {
  getWorkspaceScriptMetadataConfig,
  type WorkspaceScriptMetadata,
  type WorkspaceScriptMetadataKey,
} from "bw-common/runScript";
import { BunWorkspacesError, IS_WINDOWS } from "../internal/core";

export const createScriptRuntimeEnvVars = (
  metadata: WorkspaceScriptMetadata,
) => {
  const keys = [
    "projectPath",
    "projectName",
    "workspacePath",
    "workspaceRelativePath",
    "scriptName",
    "workspaceName",
  ] as const satisfies WorkspaceScriptMetadataKey[];

  return keys.reduce(
    (acc, key) => {
      const { envVarName } = getWorkspaceScriptMetadataConfig(key);
      acc[envVarName] = metadata[key];
      return acc;
    },
    {} as Record<string, string>,
  );
};

export const interpolateWorkspaceScriptMetadata = (
  text: string,
  metadata: WorkspaceScriptMetadata,
  shell: ScriptShellOption,
) => {
  const keys = [
    "projectPath",
    "projectName",
    "workspacePath",
    "workspaceRelativePath",
    "scriptName",
    "workspaceName",
  ] as const satisfies WorkspaceScriptMetadataKey[];

  const inlineNames = keys.map(
    (key) => getWorkspaceScriptMetadataConfig(key).inlineName,
  );

  return text.replace(new RegExp(inlineNames.join("|"), "g"), (match) => {
    const key = keys.find(
      (k) => getWorkspaceScriptMetadataConfig(k).inlineName === match,
    );
    const value = metadata[key as WorkspaceScriptMetadataKey];
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
export const getWorkspaceScriptMetadata = (key: WorkspaceScriptMetadataKey) => {
  const { envVarName } = getWorkspaceScriptMetadataConfig(key);
  if (!(envVarName in process.env)) {
    throw new BunWorkspacesError(
      `getScriptMetadata() called with key "${key}" but environment variable ${envVarName} is not set. getScriptMetadata() may not have been called in a workspace script running via bun-workspaces.`,
    );
  }
  return process.env[envVarName] as string;
};
