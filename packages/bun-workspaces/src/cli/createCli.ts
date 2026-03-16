import { createCommand } from "commander";
import packageJson from "../../package.json";
import { validateCurrentBunVersion } from "../internal/bun";
import { BunWorkspacesError } from "../internal/core";
import { logger } from "../internal/logger";
import { defineGlobalCommands, defineProjectCommands } from "./commands";
import { fatalErrorLogger } from "./fatalErrorLogger";
import { initializeWithGlobalOptions } from "./globalOptions";
import {
  resolveMiddleware,
  type CliMiddleware,
  type CliMiddlewareOptions,
} from "./middleware";

export interface RunCliOptions {
  argv?: string[];
  /** Should be `true` if args do not include the binary name (e.g. `bunx bun-workspaces`) */
  programmatic?: true;
  middleware?: CliMiddlewareOptions;
}

export interface CLI {
  run: (options?: RunCliOptions) => Promise<void>;
}

export interface CreateCliOptions {
  defaultCwd?: string;
  /** Always handled when the result `.run()` is called */
  defaultMiddleware?: CliMiddlewareOptions;
}

export const createCli = ({
  defaultCwd = process.cwd(),
  defaultMiddleware,
}: CreateCliOptions = {}): CLI => {
  logger.debug(`Creating CLI with default cwd: ${defaultCwd}`);

  const run = async ({
    argv = process.argv,
    programmatic,
    middleware: _runMiddleware,
  }: RunCliOptions = {}) => {
    const middleware: CliMiddleware = resolveMiddleware(
      defaultMiddleware ?? {},
      _runMiddleware ?? {},
    );

    const errorListener = (error: Error) => {
      middleware.catchError(error);
      fatalErrorLogger.error(error);
      process.exit(1);
    };

    process.on("unhandledRejection", errorListener);

    try {
      const program = createCommand("bun-workspaces")
        .description("A CLI on top of native Bun workspaces")
        .version(packageJson.version)
        .showHelpAfterError(true);

      const defaultContext = {
        commanderProgram: program,
      };

      middleware.initProgram({ ...defaultContext, argv });

      const { args, postTerminatorArgs } = (() => {
        const terminatorIndex = argv.findIndex((arg) => arg === "--");
        return {
          args: terminatorIndex !== -1 ? argv.slice(0, terminatorIndex) : argv,
          postTerminatorArgs:
            terminatorIndex !== -1 ? argv.slice(terminatorIndex + 1) : [],
        };
      })();

      middleware.processArgv({ ...defaultContext, args, postTerminatorArgs });

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

      middleware.findProject({ ...defaultContext, project, projectError });

      if (postTerminatorArgs.length) {
        logger.debug("Has post-terminator args");
      }

      logger.debug(`Bun version: ${Bun.version}`);

      defineProjectCommands({
        program,
        project,
        projectError,
        postTerminatorArgs,
        middleware,
      });

      defineGlobalCommands({ program, postTerminatorArgs, middleware });

      logger.debug(`Commands initialized. Parsing args...`);

      middleware.preParse({ ...defaultContext, args, project, projectError });

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
      middleware.postParse({ ...defaultContext, args, project, projectError });
    }
  };

  return {
    run,
  };
};
