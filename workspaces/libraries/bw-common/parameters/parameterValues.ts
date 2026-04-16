export const SCRIPT_SHELL_OPTIONS = ["bun", "system"] as const;

export type ScriptShellOption = (typeof SCRIPT_SHELL_OPTIONS)[number];

export const OUTPUT_STYLE_VALUES = [
  "grouped",
  "prefixed",
  "plain",
  "none",
] as const;

export type OutputStyleName = (typeof OUTPUT_STYLE_VALUES)[number];
