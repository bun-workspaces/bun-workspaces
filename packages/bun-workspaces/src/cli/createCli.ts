import { createCommand, type Command } from "commander";
import packageJson from "../../package.json";
import { validateCurrentBunVersion } from "../internal/bun";
import { BunWorkspacesError } from "../internal/core";
import { logger } from "../internal/logger";
import { defineGlobalCommands, defineProjectCommands } from "./commands";
import { fatalErrorLogger } from "./fatalErrorLogger";
import { initializeWithGlobalOptions } from "./globalOptions";

export interface RunCliOptions {
  argv?: string | string[];
  /** Should be `true` if args do not include the binary name (e.g. `bunx bun-workspaces`) */
  programmatic?: true;
}

export interface CLI {
  run: (options?: RunCliOptions) => Promise<void>;
}

export interface CreateCliOptions {
  handleError?: (error: Error) => void;
  postInit?: (program: Command) => unknown;
  defaultCwd?: string;
}

export const createCli = ({
  handleError,
  postInit,
  defaultCwd = process.cwd(),
}: CreateCliOptions = {}): CLI => {
  const run = async ({
    argv = process.argv,
    programmatic,
  }: RunCliOptions = {}) => {
    const errorListener =
      handleError ??
      ((error) => {
        fatalErrorLogger.error(error);
        process.exit(1);
      });

    process.on("unhandledRejection", errorListener);

    const handleSigterm = () => {
      process.off("SIGTERM", handleSigterm);
      process.kill(-process.pid, "SIGTERM");
    };

    process.on("SIGTERM", handleSigterm);

    try {
      const program = createCommand("bun-workspaces")
        .description("A CLI on top of native Bun workspaces")
        .version(packageJson.version)
        .showHelpAfterError(true);

      postInit?.(program);

      const rawArgs = tempFixCamelCaseOptions(
        typeof argv === "string" ? argv.split(/s+/) : argv,
      );

      const { args, postTerminatorArgs } = (() => {
        const terminatorIndex = rawArgs.findIndex((arg) => arg === "--");
        return {
          args:
            terminatorIndex !== -1
              ? rawArgs.slice(0, terminatorIndex)
              : rawArgs,
          postTerminatorArgs:
            terminatorIndex !== -1 ? rawArgs.slice(terminatorIndex + 1) : [],
        };
      })();

      const bunVersionError = validateCurrentBunVersion();

      if (bunVersionError) {
        fatalErrorLogger.error(bunVersionError.message);
        process.exit(1);
      }

      const { project, projectError } = initializeWithGlobalOptions(
        program,
        args,
        defaultCwd,
      );

      defineProjectCommands({
        program,
        project,
        projectError,
        postTerminatorArgs,
      });

      defineGlobalCommands({ program, postTerminatorArgs });

      await program.parseAsync(args, {
        from: programmatic ? "user" : "node",
      });
    } catch (error) {
      if (error instanceof BunWorkspacesError) {
        logger.debug(error);
        fatalErrorLogger.error(error.message);
        process.exit(1);
      } else {
        errorListener(error as Error);
      }
    } finally {
      process.off("unhandledRejection", errorListener);
    }
  };

  return {
    run,
  };
};

/**
 * @todo
 * ! Temp backwards support for deprecated camel case options
 * ! Added October 2025, drop support in some reasonable future release
 */
const tempOptions = {
  "--nameOnly": "--name-only",
  "--noPrefix": "--no-prefix",
  "--configFile": "--config-file",
  "--logLevel": "--log-level",
};
const tempFixCamelCaseOptions = (args: string[]) =>
  args.map((arg) => {
    for (const [camel, kebab] of Object.entries(tempOptions)) {
      if (arg.startsWith(camel)) {
        return arg.replace(camel, kebab);
      }
    }
    return arg;
  });
