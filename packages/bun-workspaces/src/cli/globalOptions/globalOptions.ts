import fs from "fs";
import path from "path";
import { type Command, Option } from "commander";
import { defineErrors } from "../../internal/core";
import { logger } from "../../internal/logger";
import {
  createFileSystemProject,
  createMemoryProject,
  type FileSystemProject,
} from "../../project";
import type { CliMiddleware } from "../middleware";
import {
  type CliGlobalOptionName,
  type CliGlobalOptions,
  getCliGlobalOptionConfig,
} from "./globalOptionsConfig";

const ERRORS = defineErrors(
  "WorkingDirectoryNotFound",
  "WorkingDirectoryNotADirectory",
);

const addGlobalOption = (
  program: Command,
  optionName: CliGlobalOptionName,
  defaultOverride?: string,
) => {
  const { mainOption, shortOption, description, param, values, defaultValue } =
    getCliGlobalOptionConfig(optionName);

  let option = new Option(
    `${shortOption} ${mainOption}${param ? ` <${param}>` : ""}`,
    description,
  );

  const effectiveDefaultValue = defaultOverride ?? defaultValue;
  if (effectiveDefaultValue) {
    option = option.default(effectiveDefaultValue);
  }

  if (values?.length) {
    option = option.choices(values as string[]);
  }

  program.addOption(option);

  if (!param) {
    program.option(
      mainOption.replace(/^--/, "--no-"),
      `Set ${mainOption} as false`,
    );
  }
};

const getWorkingDirectoryFromArgs = (
  program: Command,
  args: string[],
  defaultCwd: string,
) => {
  addGlobalOption(program, "cwd", defaultCwd);
  program.parseOptions(args);
  return program.opts().cwd;
};

const defineGlobalOptions = (
  program: Command,
  args: string[],
  defaultCwd: string,
  middleware: CliMiddleware,
) => {
  const cwd = getWorkingDirectoryFromArgs(program, args, defaultCwd);

  const exists = fs.existsSync(cwd);
  const isDirectory = exists ? fs.statSync(cwd).isDirectory() : false;

  middleware.processWorkingDirectory({
    commanderProgram: program,
    workingDirectory: cwd,
    exists,
    isDirectory,
  });

  if (!exists) {
    throw new ERRORS.WorkingDirectoryNotFound(
      `Working directory not found at path "${cwd}"`,
    );
  }
  if (!isDirectory) {
    throw new ERRORS.WorkingDirectoryNotADirectory(
      `Working directory is not a directory at path "${cwd}"`,
    );
  }

  addGlobalOption(program, "logLevel");
  addGlobalOption(program, "includeRoot");

  return { cwd };
};

const applyGlobalOptions = (options: CliGlobalOptions) => {
  logger.printLevel = options.logLevel;
  logger.debug("Log level: " + options.logLevel);

  let project: FileSystemProject;
  let error: Error | null = null;
  try {
    project = createFileSystemProject({
      rootDirectory: options.cwd,
      includeRootWorkspace: options.includeRoot,
    });

    logger.debug(
      `Project: ${JSON.stringify(project.name)} (${
        project.workspaces.length
      } workspace${project.workspaces.length === 1 ? "" : "s"})`,
    );
    logger.debug("Project root: " + path.resolve(project.rootDirectory));
  } catch (_error) {
    error = _error as Error;
    project = createMemoryProject({
      workspaces: [],
    }) as unknown as FileSystemProject;
  }

  return { project, projectError: error };
};

export const initializeWithGlobalOptions = (
  program: Command,
  args: string[],
  defaultCwd: string,
  middleware: CliMiddleware,
) => {
  program.allowUnknownOption(true);

  const { cwd } = defineGlobalOptions(program, args, defaultCwd, middleware);

  program.parseOptions(args);
  program.allowUnknownOption(false);

  const options = program.opts() as CliGlobalOptions;

  return applyGlobalOptions({
    ...options,
    cwd,
  });
};
