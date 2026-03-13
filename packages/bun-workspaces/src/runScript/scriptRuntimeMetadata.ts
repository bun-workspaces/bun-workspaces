import { IS_WINDOWS } from "../internal/core";
import type { ScriptShellOption } from "./scriptShellOption";

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

export const createScriptRuntimeEnvVars = (metadata: ScriptRuntimeMetadata) =>
  Object.entries(SCRIPT_RUNTIME_METADATA_CONFIG).reduce(
    (acc, [key, value]) => {
      acc[value.envVarName] = metadata[key as keyof ScriptRuntimeMetadata];
      return acc;
    },
    {} as Record<string, string>,
  );

export const interpolateScriptRuntimeMetadata = (
  text: string,
  metadata: ScriptRuntimeMetadata,
  shell: ScriptShellOption,
) =>
  text.replace(
    new RegExp(
      Object.values(SCRIPT_RUNTIME_METADATA_CONFIG)
        .flatMap((value) => value.inlineName)
        .join("|"),
      "g",
    ),
    (match) => {
      const key = Object.entries(SCRIPT_RUNTIME_METADATA_CONFIG).find(
        ([_, value]) => value.inlineName === match,
      )?.[0];
      const value = metadata[key as keyof ScriptRuntimeMetadata];
      if (IS_WINDOWS && shell === "bun") {
        return value.replace(/\\/g, "\\\\");
      }
      return value;
    },
  );
