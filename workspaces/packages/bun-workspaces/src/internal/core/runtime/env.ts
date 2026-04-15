/* eslint-disable no-console */

const _process =
  typeof process === "undefined"
    ? { env: {} as Record<string, string> }
    : process;

const RUNTIME_MODE_VALUES = ["development", "production", "test"] as const;

export type RuntimeMode = "development" | "production" | "test";

const _RUNTIME_MODE: RuntimeMode = ((_process.env
  ._BW_RUNTIME_MODE as RuntimeMode) ||
  (process.env.NODE_ENV?.match(/test(ing | s)?/)
    ? "test"
    : process.env.NODE_ENV === "development"
      ? "development"
      : "production")) as RuntimeMode;

export const RUNTIME_MODE = RUNTIME_MODE_VALUES.includes(_RUNTIME_MODE)
  ? _RUNTIME_MODE
  : "production";

if (RUNTIME_MODE !== _RUNTIME_MODE) {
  // eslint-disable-next-line no-console
  console.error(
    `Env var _BW_RUNTIME_MODE has an invalid value: "${_RUNTIME_MODE}". Defaulting to "${RUNTIME_MODE}". Accepted values: ${RUNTIME_MODE_VALUES.join(", ")}.`,
  );
}

export const IS_INTERNAL_TEST = process.env._BW_IS_INTERNAL_TEST === "true";
export const IS_TEST = RUNTIME_MODE === "test";
export const IS_PRODUCTION = RUNTIME_MODE === "production";
export const IS_DEVELOPMENT = RUNTIME_MODE === "development";
