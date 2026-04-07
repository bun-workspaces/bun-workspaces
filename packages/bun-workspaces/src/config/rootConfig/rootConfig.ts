import validate from "../../internal/generated/ajv/validateRootConfig";
import type { ShellOption } from "../../project";
import {
  determineParallelMax,
  resolveScriptShell,
  type ParallelMaxValue,
  type ScriptShellOption,
} from "../../runScript";
import { getUserEnvVar } from "../userEnvVars";
import type { AjvSchemaValidator } from "../util/ajvTypes";
import { executeValidator } from "../util/validateConfig";
import { ROOT_CONFIG_ERRORS } from "./errors";

export type RootConfig = {
  defaults?: {
    /** The maximum number of scripts that can run in parallel. (default: "auto") */
    parallelMax?: ParallelMaxValue;
    /** The shell to use for inline scripts. (default: "bun") */
    shell?: ShellOption;
    /** Whether to include the root workspace in the workspaces list by default. (default: false) */
    includeRootWorkspace?: boolean;
  };
};

export type ResolvedRootConfig = {
  defaults: {
    parallelMax: number;
    shell: ScriptShellOption;
    /** `undefined` means the value was not set in the input config */
    includeRootWorkspace: boolean | undefined;
  };
};

export const validateRootConfig = (config: RootConfig) =>
  executeValidator(
    validate as unknown as AjvSchemaValidator<RootConfig>,
    "RootConfig",
    config,
    ROOT_CONFIG_ERRORS.InvalidRootConfig,
  );

export const createDefaultRootConfig = (): ResolvedRootConfig =>
  resolveRootConfig({});

export const resolveRootConfig = (config: RootConfig): ResolvedRootConfig => {
  validateRootConfig(config);

  return {
    defaults: {
      parallelMax: determineParallelMax(
        (config.defaults?.parallelMax as ParallelMaxValue) ?? "default",
        " (set by root config)",
      ),
      shell: resolveScriptShell(config.defaults?.shell),
      includeRootWorkspace:
        config.defaults?.includeRootWorkspace ??
        getUserEnvVar("includeRootWorkspaceDefault") === "true",
    },
  };
};
