import { type FromSchema } from "json-schema-to-ts";
import { resolveOptionalArray } from "../../internal/core";
import _validate from "../../internal/generated/ajv/validateWorkspaceConfig";
import type { AjvSchemaValidator } from "../util/ajvTypes";
import { executeValidator } from "../util/validateConfig";
import { WORKSPACE_CONFIG_ERRORS } from "./errors";
import type { WORKSPACE_CONFIG_JSON_SCHEMA } from "./workspaceConfigSchema";

const validate = _validate as unknown as AjvSchemaValidator<WorkspaceConfig>;

/**
 * @todo json-schema-to-ts doesn't support the union type for alias as it is,
 * but AJV error messaging for oneOf is not good
 */
export type WorkspaceConfig = Omit<
  FromSchema<typeof WORKSPACE_CONFIG_JSON_SCHEMA>,
  "alias"
> & {
  alias?: string | string[];
};

export type ResolvedWorkspaceConfig = {
  aliases: string[];
  scripts: Record<string, ScriptConfig>;
};

export type ScriptConfig = NonNullable<WorkspaceConfig["scripts"]>[string];

export const validateWorkspaceConfig = (config: WorkspaceConfig) =>
  executeValidator(
    validate as unknown as AjvSchemaValidator<WorkspaceConfig>,
    "WorkspaceConfig",
    {
      ...config,
    },
    WORKSPACE_CONFIG_ERRORS.InvalidWorkspaceConfig,
  );

export const resolveWorkspaceConfig = (
  config: WorkspaceConfig,
): ResolvedWorkspaceConfig => {
  if (Array.isArray((config as ResolvedWorkspaceConfig).aliases)) {
    const { aliases, ...rest } = config as ResolvedWorkspaceConfig;
    validateWorkspaceConfig({
      ...rest,
      alias: aliases,
    });
    return {
      aliases,
      ...rest,
    };
  }

  validateWorkspaceConfig(config);

  return {
    aliases: resolveOptionalArray(config.alias ?? []),
    scripts: config.scripts ?? {},
  };
};

export const createDefaultWorkspaceConfig = (): ResolvedWorkspaceConfig =>
  resolveWorkspaceConfig({});
