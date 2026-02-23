import { Option, type Command } from "commander";
import { BunWorkspacesError } from "../../internal/core";
import { createLogger, logger } from "../../internal/logger";
import type { FileSystemProject } from "../../project/implementations/fileSystemProject";
import type { Workspace } from "../../workspaces";
import {
  getCliCommandConfig,
  type CliCommandName,
  type CliGlobalCommandName,
  type CliProjectCommandName,
} from "./commandsConfig";

/** @todo DRY use of output text in cases such as having no workspaces/scripts */

export interface GlobalCommandContext {
  program: Command;
  postTerminatorArgs: string[];
}

export type ProjectCommandContext = GlobalCommandContext & {
  project: FileSystemProject;
  projectError: Error | null;
};

/** Splits workspace patterns by whitespace, but allows escaping spaces via backslash */
export const splitWorkspacePatterns = (workspacePatterns: string) =>
  workspacePatterns
    .split(/(?<!\\)\s+/)
    .filter(Boolean)
    .map((pattern) => pattern.replace(/\\\s/g, " "));

export const createWorkspaceInfoLines = (workspace: Workspace) => [
  `Workspace: ${workspace.name}${workspace.isRoot ? " (root)" : ""}`,
  ` - Aliases: ${workspace.aliases.join(", ")}`,
  ` - Path: ${workspace.path}`,
  ` - Glob Match: ${workspace.matchPattern}`,
  ` - Scripts: ${workspace.scripts.join(", ")}`,
  ` - Dependencies: ${workspace.dependencies.join(", ")}`,
  ` - Dependents: ${workspace.dependents.join(", ")}`,
];

export const createScriptInfoLines = (
  script: string,
  workspaces: Workspace[],
) => [
  `Script: ${script}`,
  ...workspaces.map((workspace) => ` - ${workspace.name}`),
];

export const createJsonLines = (data: unknown, options: { pretty: boolean }) =>
  JSON.stringify(data, null, options.pretty ? 2 : undefined).split("\n");

export const commandOutputLogger = createLogger("");
commandOutputLogger.printLevel = "info";

const handleCommand =
  <HandlerContext extends GlobalCommandContext, ActionArgs extends unknown[]>(
    commandName: CliCommandName,
    handler: (context: HandlerContext, ...actionArgs: ActionArgs) => void,
  ) =>
  (context: HandlerContext) => {
    const config = getCliCommandConfig(commandName);
    let { program } = context;

    program = program
      .command(config.command)
      .aliases(config.aliases)
      .description(config.description);

    for (const { flags, description, values } of Object.values(
      config.options,
    )) {
      const option = new Option(flags.join(", "), description);
      if (values?.length) {
        option.choices(values);
      }
      program.addOption(option);
    }

    program = program.action(async (...actionArgs) => {
      try {
        await handler(context, ...(actionArgs as ActionArgs));
      } catch (error) {
        if (error instanceof BunWorkspacesError) {
          logger.error(error.message);
          process.exit(1);
        }
        throw error;
      }
    });

    return program;
  };

export const handleGlobalCommand =
  <ActionArgs extends unknown[]>(
    commandName: CliGlobalCommandName,
    handler: (context: GlobalCommandContext, ...actionArgs: ActionArgs) => void,
  ) =>
  (context: GlobalCommandContext) =>
    handleCommand(commandName, handler)(context);

export const handleProjectCommand =
  <ActionArgs extends unknown[]>(
    commandName: CliProjectCommandName,
    handler: (
      context: Omit<ProjectCommandContext, "projectError">,
      ...actionArgs: ActionArgs
    ) => void,
  ) =>
  (context: ProjectCommandContext) =>
    handleCommand<ProjectCommandContext, ActionArgs>(
      commandName,
      async (context, ...actionArgs) => {
        const { projectError } = context;
        if (projectError) {
          logger.error(projectError.message);
          process.exit(1);
        }
        await handler(context, ...actionArgs);
      },
    )(context);
