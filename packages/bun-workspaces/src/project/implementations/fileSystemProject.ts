import fs from "fs";
import path from "path";
import { loadRootConfig } from "../../config";
import { getUserEnvVar } from "../../config/userEnvVars";
import type { SimpleAsyncIterable, Simplify } from "../../internal/core";
import { DEFAULT_TEMP_DIR } from "../../internal/core";
import { logger } from "../../internal/logger";
import {
  runScript,
  runScripts,
  createScriptRuntimeEnvVars,
  interpolateScriptRuntimeMetadata,
  type RunScriptsParallelOptions,
  type ScriptRuntimeMetadata,
  type RunScriptsSummary,
  type RunScriptsOutput,
  type RunScriptExit,
  type OutputChunk,
  type OutputStreamName,
} from "../../runScript";
import type { MultiProcessOutput } from "../../runScript/output/multiProcessOutput";
import { checkIsRecursiveScript } from "../../runScript/recursion";
import {
  resolveScriptShell,
  type ScriptShellOption,
} from "../../runScript/scriptShellOption";
import {
  findWorkspaces,
  sortWorkspaces,
  type Workspace,
} from "../../workspaces";
import { preventDependencyCycles } from "../../workspaces/dependencyGraph";
import { PROJECT_ERRORS } from "../errors";
import type { Project, ProjectConfig } from "../project";
import {
  ProjectBase,
  resolveRootWorkspaceSelector,
  resolveWorkspacePath,
  ROOT_WORKSPACE_SELECTOR,
} from "./projectBase";

/** Arguments for {@link createFileSystemProject} */
export type CreateFileSystemProjectOptions = {
  /** The directory containing the root package.json. Often the same root as a git repository. Relative to process.cwd(). The default is process.cwd(). */
  rootDirectory?: string;
  /**
   * The name of the project.
   *
   * By default will use the root package.json name
   */
  name?: string;
  /** Whether to include the root workspace as a normal workspace. This overrides any config or env var settings. */
  includeRootWorkspace?: boolean;
};

export type ShellOption = ScriptShellOption | "default";

export type InlineScriptOptions = {
  /** A name to act as a label for the inline script */
  scriptName?: string;
  /** Whether to run the script as an inline command */
  shell?: ShellOption;
};

/** Arguments for `FileSystemProject.runWorkspaceScript` */
export type RunWorkspaceScriptOptions = {
  /** The name of the workspace to run the script in */
  workspaceNameOrAlias: string;
  /** The name of the script to run, or an inline command when `inline` is true */
  script: string;
  /** Whether to run the script as an inline command */
  inline?: boolean | InlineScriptOptions;
  /** The arguments to append to the script command */
  args?: string;
};

/** Metadata associated with a workspace script */
export type RunWorkspaceScriptMetadata = {
  workspace: Workspace;
};

export type RunWorkspaceScriptExit = Simplify<
  RunScriptExit<RunWorkspaceScriptMetadata>
>;

// TODO Rename after removal of deprecated form of RunWorkspaceScriptOutput
export type RunWorkspaceScriptProcessOutput = MultiProcessOutput<
  RunWorkspaceScriptMetadata & { streamName: OutputStreamName }
> &
  /** @deprecated */
  SimpleAsyncIterable<OutputChunk>;

/** Result of `FileSystemProject.runWorkspaceScript` */
export type RunWorkspaceScriptResult = {
  output: RunWorkspaceScriptProcessOutput;
  exit: Promise<RunWorkspaceScriptExit>;
};

export type ParallelOption = boolean | RunScriptsParallelOptions;

/** Arguments for `FileSystemProject.runScriptAcrossWorkspaces` */
export type RunScriptAcrossWorkspacesOptions = {
  /**
   * Workspace names, aliases, or patterns including a wildcard.
   *
   * When not provided, all workspaces that the script can be ran in will be used.
   */
  workspacePatterns?: string[];
  /** The name of the script to run, or an inline command when `inline` is true */
  script: string;
  /** Whether to run the script as an inline command */
  inline?: boolean | InlineScriptOptions;
  /** The arguments to append to the script command. `<workspaceName>` will be replaced with the workspace name */
  args?: string;
  /** Whether to run the scripts in parallel (series by default) */
  parallel?: ParallelOption;
  /** When `true`, run scripts so that dependent workspaces run only after their dependencies */
  dependencyOrder?: boolean;
  /** When `true`, continue running scripts even if a dependency fails (Only relevant when `dependencyOrder` is `true`) */
  continueOnDependencyFailure?: boolean;
};

export type RunScriptAcrossWorkspacesOutput = Simplify<
  RunScriptsOutput<RunWorkspaceScriptMetadata>
>;

export type RunScriptAcrossWorkspacesSummary = Simplify<
  RunScriptsSummary<RunWorkspaceScriptMetadata>
>;

// TODO Rename after removal of deprecated form of RunScriptAcrossWorkspacesOutput
export type RunScriptAcrossWorkspacesProcessOutput = MultiProcessOutput<
  RunWorkspaceScriptMetadata & { streamName: OutputStreamName }
> &
  /** @deprecated */
  SimpleAsyncIterable<RunScriptAcrossWorkspacesOutput>;

/** Result of `FileSystemProject.runScriptAcrossWorkspaces` */
export type RunScriptAcrossWorkspacesResult = {
  output: RunScriptAcrossWorkspacesProcessOutput;
  summary: Promise<RunScriptAcrossWorkspacesSummary>;
};

class _FileSystemProject extends ProjectBase implements Project {
  public readonly rootDirectory: string;
  public readonly workspaces: Workspace[];
  public readonly name: string;
  public readonly sourceType = "fileSystem";
  public readonly config: ProjectConfig;
  public readonly rootWorkspace: Workspace;

  constructor(
    options: CreateFileSystemProjectOptions & {
      /** @deprecated  */
      workspaceAliases?: Record<string, string>;
    },
  ) {
    super();

    if (!_FileSystemProject.#initialized) {
      DEFAULT_TEMP_DIR.initialize(true);
      _FileSystemProject.#initialized = true;
    }

    this.rootDirectory = path.resolve(
      process.cwd(),
      options.rootDirectory ?? "",
    );

    const rootConfig = loadRootConfig(this.rootDirectory);

    const { workspaces, workspaceMap, rootWorkspace } = findWorkspaces({
      rootDirectory: this.rootDirectory,
      workspaceAliases: options.workspaceAliases,
      includeRootWorkspace:
        options.includeRootWorkspace ??
        rootConfig.defaults.includeRootWorkspace ??
        getUserEnvVar("includeRootWorkspaceDefault") === "true",
    });

    this.rootWorkspace = rootWorkspace;

    this.workspaces = workspaces;

    this.config = {
      root: rootConfig,
      workspaces: Object.fromEntries(
        Object.entries(workspaceMap)
          .map(([name, { config }]) => [name, config])
          .filter(([_, config]) => config !== undefined),
      ),
    };

    if (!options.name) {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(this.rootDirectory, "package.json"), "utf8"),
      );
      this.name = packageJson.name ?? "";
    } else {
      this.name = "";
    }
  }

  runWorkspaceScript(
    options: RunWorkspaceScriptOptions,
  ): RunWorkspaceScriptResult {
    const workspace = resolveRootWorkspaceSelector(
      options.workspaceNameOrAlias,
      this,
    );

    if (!workspace) {
      throw new PROJECT_ERRORS.ProjectWorkspaceNotFound(
        `Workspace not found: ${JSON.stringify(options.workspaceNameOrAlias)}`,
      );
    }

    const shell = resolveScriptShell(
      options.inline && typeof options.inline === "object"
        ? options.inline.shell
        : this.config.root.defaults.shell,
    );

    logger.debug(
      `Running script ${options.inline ? "inline command" : options.script} in workspace ${workspace.name}${options.inline ? ` using the ${shell} shell` : ""}`,
    );

    const inlineScriptName =
      typeof options.inline === "object"
        ? (options.inline?.scriptName ?? "")
        : "";

    const scriptRuntimeMetadata: ScriptRuntimeMetadata = {
      projectPath: this.rootDirectory,
      projectName: this.name,
      workspacePath: resolveWorkspacePath(this, workspace),
      workspaceRelativePath: workspace.path,
      workspaceName: workspace.name,
      scriptName: options.inline ? inlineScriptName : options.script,
    };

    const args = interpolateScriptRuntimeMetadata(
      options.args ?? "",
      scriptRuntimeMetadata,
      shell,
    );

    const script = options.inline
      ? interpolateScriptRuntimeMetadata(
          options.script,
          scriptRuntimeMetadata,
          shell,
        ) + (args ? " " + args : "")
      : options.script;

    if (!options.inline && checkIsRecursiveScript(workspace.name, script)) {
      throw new PROJECT_ERRORS.RecursiveWorkspaceScript(
        `Script "${script}" recursively calls itself in workspace "${workspace.name}"`,
      );
    }

    const scriptCommand = options.inline
      ? {
          command: script,
          workingDirectory: resolveWorkspacePath(this, workspace),
        }
      : this.createScriptCommand({
          workspaceNameOrAlias: options.workspaceNameOrAlias,
          scriptName: script,
          args,
        }).commandDetails;

    const result = runScript({
      scriptCommand,
      metadata: {
        workspace,
      },
      env: createScriptRuntimeEnvVars(scriptRuntimeMetadata),
      shell,
    });

    const output = result.processOutput as RunWorkspaceScriptProcessOutput;
    output[Symbol.asyncIterator] = async function* () {
      logger.warn(
        new Error(
          "Iterating directly over runWorkspaceScript output is deprecated: Use output.bytes() or output.text() instead",
        ),
      );
      for await (const chunk of result.output) {
        yield chunk;
      }
    };

    return {
      exit: result.exit,
      output,
    };
  }

  runScriptAcrossWorkspaces(
    options: RunScriptAcrossWorkspacesOptions,
  ): RunScriptAcrossWorkspacesResult {
    const matchedWorkspaces = sortWorkspaces(
      (
        options.workspacePatterns ??
        this.workspaces.map((workspace) => workspace.name)
      ).flatMap((pattern) => this.findWorkspacesByPattern(pattern)),
    );

    let workspaces = matchedWorkspaces
      .filter(
        (workspace) =>
          options.inline || workspace.scripts.includes(options.script),
      )
      .sort((a, b) => {
        const aScriptConfig =
          this.config.workspaces[a.name]?.scripts[options.script];

        const bScriptConfig =
          this.config.workspaces[b.name]?.scripts[options.script];

        if (!aScriptConfig) {
          return bScriptConfig ? 1 : 0;
        }

        if (!bScriptConfig) {
          return aScriptConfig ? -1 : 0;
        }

        return (aScriptConfig.order ?? 0) - (bScriptConfig.order ?? 0);
      });

    if (!workspaces.length) {
      const isSingleMatchNotFound =
        options.workspacePatterns?.length === 1 &&
        !options.workspacePatterns[0].includes("*") &&
        !matchedWorkspaces.length;

      throw new PROJECT_ERRORS.ProjectWorkspaceNotFound(
        isSingleMatchNotFound
          ? `Workspace name or alias not found: ${JSON.stringify(options?.workspacePatterns?.[0])}`
          : `No matching workspaces found with script ${JSON.stringify(options.script)}`,
      );
    }

    if (options.dependencyOrder) {
      const cycleDetection = preventDependencyCycles(workspaces);
      workspaces = cycleDetection.workspaces;
      for (const cycle of cycleDetection.cycles) {
        logger.warn(
          `Dependency cycle detected: ${cycle.dependency} -> ${cycle.dependent} (ignoring)`,
        );
      }
    }

    const recursiveWorkspace = workspaces.find((workspace) =>
      checkIsRecursiveScript(workspace.name, options.script),
    );
    if (recursiveWorkspace && !options.inline) {
      throw new PROJECT_ERRORS.RecursiveWorkspaceScript(
        `Script "${options.script}" recursively calls itself in workspace "${recursiveWorkspace.name}"`,
      );
    }

    const shell = resolveScriptShell(
      options.inline && typeof options.inline === "object"
        ? options.inline.shell
        : this.config.root.defaults.shell,
    );

    logger.debug(
      `Running script ${options.inline ? "inline command" : options.script} across workspaces${options.inline ? ` using the ${shell} shell` : ""}: ${workspaces.map((workspace) => workspace.name).join(", ")}`,
    );

    const result = runScripts({
      scripts: workspaces.map((workspace) => {
        const inlineScriptName =
          typeof options.inline === "object"
            ? (options.inline?.scriptName ?? "")
            : "";

        const scriptRuntimeMetadata: ScriptRuntimeMetadata = {
          projectPath: this.rootDirectory,
          projectName: this.name,
          workspacePath: resolveWorkspacePath(this, workspace),
          workspaceRelativePath: workspace.path,
          workspaceName: workspace.name,
          scriptName: options.inline ? inlineScriptName : options.script,
        };

        const args = interpolateScriptRuntimeMetadata(
          options.args ?? "",
          scriptRuntimeMetadata,
          shell,
        );

        const script = options.inline
          ? interpolateScriptRuntimeMetadata(
              options.script,
              scriptRuntimeMetadata,
              shell,
            ) + (args ? " " + args : "")
          : options.script;

        const scriptCommand = options.inline
          ? {
              command: script,
              workingDirectory: resolveWorkspacePath(this, workspace),
            }
          : this.createScriptCommand({
              workspaceNameOrAlias:
                workspace.name === this.rootWorkspace.name
                  ? ROOT_WORKSPACE_SELECTOR
                  : workspace.name,
              scriptName: script,
              args,
            }).commandDetails;

        return {
          metadata: {
            workspace,
          },
          scriptCommand,
          env: createScriptRuntimeEnvVars(scriptRuntimeMetadata),
          shell,
          dependsOn: options.dependencyOrder
            ? workspace.dependencies.map((dependency) =>
                workspaces.findIndex((w) => w.name === dependency),
              )
            : undefined,
        };
      }),
      continueOnDependencyFailure: options.continueOnDependencyFailure,
      parallel:
        options.parallel === true
          ? { max: this.config.root.defaults.parallelMax }
          : (options.parallel ?? false),
    });

    const output =
      result.processOutput as RunScriptAcrossWorkspacesProcessOutput;
    output[Symbol.asyncIterator] = async function* () {
      logger.warn(
        new Error(
          "Iterating directly over runScriptAcrossWorkspaces output is deprecated: Use output.bytes() or output.text() instead",
        ),
      );
      for await (const chunk of result.output) {
        yield chunk;
      }
    };

    return {
      summary: result.summary,
      output,
    };
  }

  static #initialized = false;
}

/** An implementation of {@link Project} that is created from a root directory in the file system. */
export type FileSystemProject = Simplify<_FileSystemProject>;

/**
 * Create a {@link Project} based on a given root directory.
 * Automatically finds workspaces based on the root package.json "workspaces" field
 * and detects and utilizes any provided configuration.
 */
export const createFileSystemProject = (
  options: CreateFileSystemProjectOptions = {},
): FileSystemProject => new _FileSystemProject(options);

/** @deprecated temporarily supports workspaceAliases from deprecated config file */
export const _internalCreateFileSystemProject = (
  options: CreateFileSystemProjectOptions & {
    /** @deprecated  */
    workspaceAliases?: Record<string, string>;
  },
): FileSystemProject => new _FileSystemProject(options);
