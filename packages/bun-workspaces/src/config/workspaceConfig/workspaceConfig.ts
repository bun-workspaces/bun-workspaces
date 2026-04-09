import { resolveOptionalArray } from "../../internal/core";
import _validate from "../../internal/generated/ajv/validateWorkspaceConfig";
import type { AjvSchemaValidator } from "../util/ajvTypes";
import { executeValidator } from "../util/validateConfig";
import { WORKSPACE_CONFIG_ERRORS } from "./errors";

const validate = _validate as unknown as AjvSchemaValidator<WorkspaceConfig>;

export type WorkspaceDependenciesRule = {
  allowPatterns?: string[];
  denyPatterns?: string[];
};

export type WorkspaceRules = {
  /** Allowed or denied workspace dependencies */
  workspaceDependencies?: WorkspaceDependenciesRule;
};

/** Configuration that applies to a specific package.json script */
export type ScriptConfig = {
  /**
   * The order in which the script should be executed.
   *
   * This is used to sort the scripts in the workspace.
   *
   * Scripts with no `order` set will be executed in alphanumerical order
   * of their relative path from the project root.
   */
  order?: number;
};

/** Configuration that applies to a specific workspace */
export type WorkspaceConfig = {
  /**
   * An alias or list of aliases for the workspace.
   *
   * These must be unique to other workspaces' aliases
   * and package.json names.
   */
  alias?: string | string[];
  /**
   * Tags for the workspace.
   *
   * These can be used to group workspaces
   * by a common tag.
   */
  tags?: string[];
  /**
   * Configuration that maps to a script name in the workspace's package.json.
   */
  scripts?: Record<string, ScriptConfig>;
  /**
   * Rules that validate the workspace.
   */
  rules?: WorkspaceRules;
};

export type ResolvedWorkspaceConfig = {
  aliases: string[];
  tags: string[];
  scripts: Record<string, ScriptConfig>;
  rules: WorkspaceRules;
};

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
    tags: config.tags ?? [],
    scripts: config.scripts ?? {},
    rules: config.rules ?? {},
  };
};

export const createDefaultWorkspaceConfig = (): ResolvedWorkspaceConfig =>
  resolveWorkspaceConfig({});
