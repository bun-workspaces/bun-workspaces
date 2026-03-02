import fs from "fs";
import path from "path";
import { logger } from "../../../internal/logger";
import type { ParallelMaxValue, ScriptShellOption } from "../../../runScript";
import {
  handleProjectCommand,
  splitWorkspacePatterns,
} from "../commandHandlerUtils";
import { formatRunScriptOutput } from "./formatRunScriptOutput";

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
      prefix: boolean;
      inline: boolean;
      inlineName: string | undefined;
      shell: string | undefined;
      depOrder: boolean;
      ignoreDepFailure: boolean;
      jsonOutfile: string | undefined;
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
      `Command: Run script ${JSON.stringify(script)} for ${
        workspacePatterns.length
          ? "workspaces " + workspacePatterns.join(", ")
          : "all workspaces"
      } (parallel: ${!!options.parallel}, args: ${JSON.stringify(scriptArgs)})`,
    );

    const workspaceCount = project.findWorkspacesByPattern(
      ...workspacePatterns,
    ).length;

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
      parallel:
        typeof options.parallel === "boolean" ||
        typeof options.parallel === "undefined"
          ? options.parallel
          : options.parallel === "true"
            ? true
            : options.parallel === "false"
              ? false
              : { max: options.parallel as ParallelMaxValue },
    });

    const scriptName = options.inline
      ? options.inlineName || "(inline)"
      : script;

    const handleOutput = async () => {
      for await (const { line, metadata } of formatRunScriptOutput(output, {
        prefix: options.prefix,
        scriptName,
        stripDisruptiveControls: workspaceCount > 1 || !!options.parallel,
      })) {
        process[metadata.streamName].write(line);
      }
    };

    handleOutput();

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
    }
  },
);
