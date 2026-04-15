import { BunWorkspacesError } from "../../../../internal/core/error";
import { IS_TTY } from "../../../../internal/core/runtime/terminal";

export const OUTPUT_STYLE_VALUES = [
  "grouped",
  "prefixed",
  "plain",
  "none",
] as const;

export type OutputStyleName = (typeof OUTPUT_STYLE_VALUES)[number];

export const getDefaultOutputStyle = (): OutputStyleName =>
  IS_TTY ? "grouped" : "prefixed";

export const validateOutputStyle = (style: string): OutputStyleName => {
  if (!OUTPUT_STYLE_VALUES.includes(style as OutputStyleName)) {
    throw new BunWorkspacesError(
      `Invalid output style: "${style}" (accepted values: ${OUTPUT_STYLE_VALUES.join(", ")})`,
    );
  }
  return style as OutputStyleName;
};
