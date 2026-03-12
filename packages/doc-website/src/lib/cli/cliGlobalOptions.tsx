import {
  getCliGlobalOptionConfig,
  type CliGlobalOptionConfig,
  type CliGlobalOptionName,
} from "bun-workspaces/src/cli/";
import type { CliGlobalOptionContent, CliGlobalOptionInfo } from "./cliOption";

const defineOptionContent = (
  optionName: CliGlobalOptionName,
  factory: (
    optionConfig: CliGlobalOptionConfig
  ) => Omit<CliGlobalOptionInfo, "optionName">
): CliGlobalOptionContent => {
  const config = getCliGlobalOptionConfig(optionName);
  const content = factory(config);
  return {
    optionName,
    ...config,
    ...content,
  };
};

const CLI_GLOBAL_OPTIONS_CONTENT = {
  cwd: defineOptionContent("cwd", ({ mainOption, shortOption }) => ({
    title: "Working Directory",
    description:
      "Get the project root from a specific directory. This should be where the root package.json of your project is located.",
    examples: [
      `bw ${mainOption}=/path/to/your/project list-workspaces`,
      `bw ${shortOption} /path/to/your/project list-workspaces`,
    ],
  })),
  includeRoot: defineOptionContent(
    "includeRoot",
    ({ mainOption, shortOption }) => ({
      title: "Include Root",
      description:
        "Include the root workspace as a normal workspace. This overrides config and environment variable settings.",
      examples: [
        `bw ${mainOption} list-workspaces`,
        `bw ${shortOption} list-workspaces`,
        "",
        `bw ${mainOption.replace("--", "--no-")} list-workspaces # disable (to override config/env)`,
      ],
    })
  ),
  logLevel: defineOptionContent("logLevel", ({ mainOption, shortOption }) => ({
    title: "Log Level",
    description:
      'Set the logging level. Script output of workspaces is always preserved, except when log level is set to "silent".',
    examples: [
      `bw ${mainOption}=silent list-workspaces`,
      `bw ${shortOption} error list-workspaces`,
    ],
  })),
} as const satisfies Record<CliGlobalOptionName, CliGlobalOptionContent>;

export const getCliGlobalOptionContent = (optionName: CliGlobalOptionName) =>
  CLI_GLOBAL_OPTIONS_CONTENT[optionName];

export const getCliGlobalOptionsContent = () =>
  Object.values(CLI_GLOBAL_OPTIONS_CONTENT);
