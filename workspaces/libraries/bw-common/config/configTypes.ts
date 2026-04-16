import type {
  ParallelMaxValue,
  ScriptShellOption,
  ShellOption,
} from "../parameters";

export type WorkspaceDependenciesRule = {
  allowPatterns?: string[];
  denyPatterns?: string[];
};

export type WorkspaceRules = {
  workspaceDependencies?: WorkspaceDependenciesRule;
};

/** Configuration that applies to a specific package.json script */
export type ScriptConfig = {
  /**
   * The order in which the script should be executed.
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
   * These can be used to group workspaces by a common tag.
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
