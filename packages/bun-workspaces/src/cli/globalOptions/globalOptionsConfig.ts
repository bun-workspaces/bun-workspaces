import { LOG_LEVELS, type LogLevelSetting } from "../../internal/logger";

export interface CliGlobalOptions {
  logLevel: LogLevelSetting;
  cwd: string;
  includeRoot: boolean;
}

export interface CliGlobalOptionConfig {
  mainOption: string;
  shortOption: string;
  description: string;
  defaultValue: string;
  values: string[] | null;
  param: string;
}

const CLI_GLOBAL_OPTIONS_CONFIG = {
  logLevel: {
    mainOption: "--log-level",
    shortOption: "-l",
    description: "Log levels",
    defaultValue: "info",
    values: [...LOG_LEVELS, "silent"] satisfies LogLevelSetting[],
    param: "level",
  },
  cwd: {
    mainOption: "--cwd",
    shortOption: "-d",
    description: "Working directory",
    defaultValue: ".",
    values: null,
    param: "path",
  },
  includeRoot: {
    mainOption: "--include-root",
    shortOption: "-r",
    description: "Include the root workspace as a normal workspace",
    defaultValue: "",
    values: null,
    param: "",
  },
} as const satisfies Record<keyof CliGlobalOptions, CliGlobalOptionConfig>;

export type CliGlobalOptionName = keyof CliGlobalOptions;

export const getCliGlobalOptionConfig = (optionName: CliGlobalOptionName) =>
  CLI_GLOBAL_OPTIONS_CONFIG[optionName];

export const getCliGlobalOptionNames = () =>
  Object.keys(CLI_GLOBAL_OPTIONS_CONFIG) as CliGlobalOptionName[];
