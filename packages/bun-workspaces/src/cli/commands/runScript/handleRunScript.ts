import fs from "fs";
import path from "path";
import { logger } from "../../../internal/logger";
import type { ParallelMaxValue, ScriptShellOption } from "../../../runScript";
import {
  handleProjectCommand,
  splitWorkspacePatterns,
} from "../commandHandlerUtils";
import { DEFAULT_GROUPED_LINES } from "../commandsConfig";
import {
  getDefaultOutputStyle,
  validateOutputStyle,
  type OutputStyleName,
} from "./output/outputStyle";
import {
  createScriptEvent,
  createScriptEventTarget,
  renderGroupedOutput,
} from "./output/renderGroupedOutput";
import { renderPlainOutput } from "./output/renderPlainOutput";

export const runScript = handleProjectCommand(
  "runScript",
  async (
    { project, postTerminatorArgs },
    positionalScript: string,
    positionalWorkspacePatterns: string[],
    options: {
      script: string | undefined;
      workspacePatterns: string | undefined;
      parallel: boolean | string;
      args: string;
      /** @deprecated by --output-style=plain instead */
      prefix: boolean;
      inline: boolean;
      inlineName: string | undefined;
      shell: string | undefined;
      depOrder: boolean;
      ignoreDepFailure: boolean;
      jsonOutfile: string | undefined;
      outputStyle: string | undefined;
      groupedLines: string | undefined;
    },
  ) => {
    options.inlineName = options.inlineName?.trim();
    options.args = options.args?.trim();
    options.jsonOutfile = options.jsonOutfile?.trim();
    options.parallel =
      typeof options.parallel === "string"
        ? options.parallel.trim()
        : options.parallel;

    if (positionalScript && options.script) {
      // If script is provided via options, then the first positional argument is actually a workspace pattern
      positionalWorkspacePatterns.splice(0, 0, positionalScript);
    }

    const script = options.script || positionalScript;

    if (postTerminatorArgs.length && options.args) {
      logger.error(
        "CLI syntax error: Cannot use both --args and inline script args after --",
      );
      process.exit(1);
    }

    const scriptArgs = postTerminatorArgs.length
      ? postTerminatorArgs.join(" ")
      : options.args;

    if (positionalWorkspacePatterns.length && options.workspacePatterns) {
      logger.error(
        "CLI syntax error: Cannot use both inline workspace patterns and --workspace-patterns|-W option",
      );
      process.exit(1);
    }

    const workspacePatterns = positionalWorkspacePatterns?.length
      ? positionalWorkspacePatterns
      : splitWorkspacePatterns(options.workspacePatterns ?? "");

    logger.debug(
      `Command: Run ${options.inline ? "inline " : ""}script ${JSON.stringify(script)} for ${
        workspacePatterns.length
          ? "workspaces " + workspacePatterns.join(", ")
          : "all workspaces"
      }`,
    );
    logger.debug(`Options: ${JSON.stringify(options)}`);

    const workspaces = workspacePatterns.length
      ? project.findWorkspacesByPattern(...workspacePatterns)
      : options.inline
        ? project.workspaces
        : project.listWorkspacesWithScript(script);

    const scriptEventTarget = createScriptEventTarget();

    const { output, summary } = project.runScriptAcrossWorkspaces({
      workspacePatterns: workspacePatterns.length
        ? workspacePatterns
        : undefined,
      script,
      inline: options.inline
        ? options.inlineName || options.shell
          ? {
              scriptName: options.inlineName,
              shell: options.shell as ScriptShellOption,
            }
          : true
        : undefined,
      args: scriptArgs,
      dependencyOrder: options.depOrder,
      ignoreDependencyFailure: options.ignoreDepFailure,
      ignoreOutput: logger.printLevel === "silent",
      onScriptEvent: (event, { workspace, exitResult }) => {
        setTimeout(() =>
          // place at end of call stack so listeners in render func receive event
          scriptEventTarget.dispatchEvent(
            createScriptEvent[event]({
              workspace,
              exitResult,
            }),
          ),
        );
      },
      parallel:
        typeof options.parallel === "boolean" ||
        typeof options.parallel === "undefined"
          ? undefined
          : options.parallel === "true"
            ? true
            : options.parallel === "false"
              ? false
              : { max: options.parallel as ParallelMaxValue },
    });

    const scriptName = options.inline
      ? options.inlineName || "(inline)"
      : script;

    logger.debug(`Script name: ${scriptName}`);

    const stripDisruptiveControls = workspaces.length > 1 || !!options.parallel;

    logger.debug(`Strip disruptive controls: ${stripDisruptiveControls}`);

    let groupedLines: number | "all" = DEFAULT_GROUPED_LINES;
    if (options.groupedLines) {
      if (options.groupedLines === "all") {
        groupedLines = "all";
      } else {
        const parsedGroupedLines = parseInt(options.groupedLines as string);

        if (parsedGroupedLines <= 0 || isNaN(parsedGroupedLines)) {
          logger.error(
            `Invalid max grouped lines value: ${options.groupedLines}. Must be a positive number or "all".`,
          );
          process.exit(1);
        }

        groupedLines = parsedGroupedLines;
      }
    }

    logger.debug(`Effective grouped lines: ${JSON.stringify(groupedLines)}`);

    if (!options.prefix) {
      logger.warn(
        "--no-prefix is deprecated and will be removed in a future version. Use --output-style=plain instead.",
      );
      if (!options.outputStyle) {
        options.outputStyle = "plain";
      }
    }

    const outputStyleHandlers: Record<OutputStyleName, () => Promise<void>> = {
      grouped: () =>
        renderGroupedOutput(
          workspaces,
          output,
          summary,
          scriptEventTarget,
          groupedLines,
        ),
      prefixed: () =>
        renderPlainOutput(output, { prefix: true, stripDisruptiveControls }),
      plain: () =>
        renderPlainOutput(output, {
          prefix: false,
          stripDisruptiveControls,
        }),
    };

    const outputStyle = options.outputStyle
      ? validateOutputStyle(options.outputStyle)
      : getDefaultOutputStyle();

    logger.debug(`Effective output style: ${outputStyle}`);

    await outputStyleHandlers[outputStyle]();

    const exitResults = await summary;

    exitResults.scriptResults.forEach(
      ({ success, metadata: { workspace }, exitCode }) => {
        const isSkipped = exitCode === -1;
        if (isSkipped) {
          logger.info(
            `➖ ${workspace.name}: ${scriptName} (skipped due to dependency failure)`,
          );
        } else {
          logger.info(
            `${success ? "✅" : "❌"} ${workspace.name}: ${scriptName}${exitCode ? ` (exited with code ${exitCode})` : ""}`,
          );
        }
      },
    );

    const s = exitResults.scriptResults.length === 1 ? "" : "s";
    const skippedCount = exitResults.scriptResults.filter(
      ({ exitCode }) => exitCode === -1,
    ).length;
    const skippedMessage = skippedCount ? ` (${skippedCount} skipped)` : "";
    if (exitResults.failureCount) {
      const message = `${exitResults.failureCount} of ${exitResults.scriptResults.length} script${s} failed${skippedMessage}`;
      logger.info(message);
    } else {
      logger.info(
        `${exitResults.scriptResults.length} script${s} ran successfully${skippedMessage}`,
      );
    }

    if (options.jsonOutfile) {
      const fullOutputPath = path.resolve(
        project.rootDirectory,
        options.jsonOutfile,
      );

      // Check if can make directory
      const jsonOutputDir = path.dirname(fullOutputPath);
      if (!fs.existsSync(jsonOutputDir)) {
        try {
          logger.debug(
            `Creating JSON output file directory "${jsonOutputDir}"`,
          );
          fs.mkdirSync(jsonOutputDir, { recursive: true });
        } catch (error) {
          logger.error(
            `Failed to create JSON output file directory "${jsonOutputDir}": ${error}`,
          );
          process.exit(1);
        }
      } else if (fs.statSync(jsonOutputDir).isFile()) {
        logger.error(
          `Given JSON output file directory "${jsonOutputDir}" is an existing file`,
        );
        process.exit(1);
      }

      // Check if can make file
      if (
        fs.existsSync(fullOutputPath) &&
        fs.statSync(fullOutputPath).isDirectory()
      ) {
        logger.error(
          `Given JSON output file path "${fullOutputPath}" is an existing directory`,
        );
        process.exit(1);
      }

      try {
        logger.debug(`Writing JSON output file "${fullOutputPath}"`);
        fs.writeFileSync(fullOutputPath, JSON.stringify(exitResults, null, 2));
      } catch (error) {
        logger.error(
          `Failed to write JSON output file "${fullOutputPath}": ${error}`,
        );
        process.exit(1);
      }
      logger.info(`JSON output written to ${fullOutputPath}`);
    }

    if (exitResults.failureCount) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  },
);
