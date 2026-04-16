export const SCRIPT_SHELL_OPTIONS = ["bun", "system"] as const;

export type ScriptShellOption = (typeof SCRIPT_SHELL_OPTIONS)[number];

export type ShellOption = ScriptShellOption | "default";

export const OUTPUT_STYLE_VALUES = [
  "grouped",
  "prefixed",
  "plain",
  "none",
] as const;

export type OutputStyleName = (typeof OUTPUT_STYLE_VALUES)[number];

export const PARALLEL_MAX_VALUES = ["auto", "unbounded", "default"] as const;

export type PercentageValue = `${number}%`;

/**
 * The maximum number of scripts that can run in parallel.
 *
 * - `number`: The exact number of scripts that can run in parallel.
 * - `"auto"`: The number of available logical CPU threads.
 * - `"unbounded"`: No limit.
 * - `"default"`: The default value, either "auto" or the value of the root config's "parallelMax" option.
 * - `"${number}%"`: A percentage of the available logical CPU threads (e.g. "50%").
 */
export type ParallelMaxValue =
  | number
  | (typeof PARALLEL_MAX_VALUES)[number]
  | PercentageValue;
