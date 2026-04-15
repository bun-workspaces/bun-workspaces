import { getUserEnvVar, getUserEnvVarName } from "../config/userEnvVars";
import { BunWorkspacesError } from "../internal/core/error";

export const SCRIPT_SHELL_OPTIONS = ["bun", "system"] as const;

export type ScriptShellOption = (typeof SCRIPT_SHELL_OPTIONS)[number];

export const validateScriptShellOption = (
  shell: string,
  fromEnvVar = false,
): ScriptShellOption => {
  if (!SCRIPT_SHELL_OPTIONS.includes(shell as ScriptShellOption)) {
    throw new BunWorkspacesError(
      `Invalid shell option: ${shell} (accepted values: ${SCRIPT_SHELL_OPTIONS.join(", ")})${fromEnvVar ? ` (set by env var ${getUserEnvVarName("scriptShellDefault")})` : ""}`,
    );
  }
  return shell as ScriptShellOption;
};

export const getScriptShellDefault = () => {
  const shell = getUserEnvVar("scriptShellDefault");

  return shell ? validateScriptShellOption(shell, true) : "bun";
};

export const resolveScriptShell = (shell?: string): ScriptShellOption => {
  if (
    !shell ||
    shell === "default" ||
    shell === "undefined" ||
    shell === "null"
  ) {
    return getScriptShellDefault();
  }
  return validateScriptShellOption(shell);
};
