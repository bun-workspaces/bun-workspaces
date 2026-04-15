import type { CliGlobalOptionContent, CliCommandContent } from ".";

export const getGlobalOptionId = (option: CliGlobalOptionContent) =>
  "cli-global-option-" + option.optionName;

export const getCommandId = (command: CliCommandContent) =>
  "cli-command-" + command.commandName;
