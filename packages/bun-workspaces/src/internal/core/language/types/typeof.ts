import { defineErrors } from "../../error";
import {
  resolveOptionalArray,
  type OptionalArray,
} from "../array/optionalArray";
import { type AnyFunction } from "./types";

export const InvalidJSTypeError = defineErrors("InvalidJSType").InvalidJSType;

export const InvalidJSNumberError =
  defineErrors("InvalidJSNumber").InvalidJSNumber;

export const VALIDATE_NUMBER_ERRORS = defineErrors(
  InvalidJSNumberError,
  "NoNaN",
  "NoNonFinite",
  "NoInfinity",
  "NoNegInfinity",
);

export const VALIDATE_TYPEOF_ERRORS = defineErrors(
  InvalidJSTypeError,
  "NoNull",
  "InvalidType",
);

interface JSTypeofToTypeMap {
  string: string;
  number: number;
  boolean: boolean;
  undefined: undefined;
  bigint: bigint;
  function: (...args: unknown[]) => unknown;
  object: null | object;
  symbol: symbol;
}

export type JSDataTypeofName = keyof JSTypeofToTypeMap;

export type TypeToJSTypeofName<T> = {
  [K in keyof JSTypeofToTypeMap]: T extends AnyFunction
    ? "function"
    : T extends JSTypeofToTypeMap[K]
      ? K
      : never;
}[keyof JSTypeofToTypeMap];

export type JSTypeofNameToType<Name extends JSDataTypeofName> =
  JSTypeofToTypeMap[Name];

export type TypeToJSTypeof<T> = JSTypeofNameToType<TypeToJSTypeofName<T>>;

export const isTypeof = <T, D extends JSDataTypeofName>(
  value: T,
  ...types: D[]
): value is Extract<T, JSTypeofNameToType<D>> =>
  types.includes(typeof value as D);

export type ValidateNumberRules = {
  noNaN?: boolean;
  noNonFinite?: boolean;
  noInfinity?: boolean;
  noNegInfinity?: boolean;
};

export type ValidateJSTypeOptions = {
  value: unknown;
  typeofName: OptionalArray<JSDataTypeofName>;
  /** For use in error message */
  valueLabel?: string;
  numberRules?: ValidateNumberRules;
  optional?: boolean;
};

export type ValidateJSTypesConfig = {
  [valueLabel: string]: Omit<ValidateJSTypeOptions, "valueLabel">;
};

export const validateNumber = (
  value: number,
  rules: ValidateNumberRules,
  valueLabel = "Number",
): InstanceType<typeof InvalidJSNumberError> | null => {
  if (Number.isNaN(value) && rules?.noNaN) {
    return new InvalidJSNumberError(
      `Invalid number: ${valueLabel} cannot be NaN`,
    );
  } else if (!Number.isFinite(value) && rules?.noNonFinite) {
    return new InvalidJSNumberError(
      `Invalid number: ${valueLabel} cannot be non-finite`,
    );
  } else if (value === Infinity && rules?.noInfinity) {
    return new InvalidJSNumberError(
      `Invalid number: ${valueLabel} cannot be Infinity`,
    );
  } else if (value === -Infinity && rules?.noNegInfinity) {
    return new InvalidJSNumberError(
      `Invalid number: ${valueLabel} cannot be -Infinity`,
    );
  }
  return null;
};

export const validateJSType = ({
  value,
  typeofName,
  numberRules,
  valueLabel,
  optional,
}: ValidateJSTypeOptions): InstanceType<typeof InvalidJSTypeError> | null => {
  if (optional && (value === null || value === undefined)) return null;
  const typeofNames = resolveOptionalArray(typeofName);

  const isValid = isTypeof(value, ...typeofNames);
  if (isValid && typeof value === "number" && numberRules) {
    return validateNumber(value, numberRules, valueLabel);
  } else if (isValid && typeof value === "object" && value === null) {
    return new InvalidJSTypeError(
      `Type error: ${valueLabel ?? "Value"} cannot be null`,
    );
  } else if (!isValid) {
    return new InvalidJSTypeError(
      `Type error: ${valueLabel ?? "Value"} expects type ${typeofNames.join(" | ")}, received ${
        value === null ? "null" : typeof value
      }`,
    );
  }

  return null;
};

export const validateJSTypes = (
  config: ValidateJSTypesConfig,
): InstanceType<typeof InvalidJSTypeError> | null => {
  const errors: string[] = [];
  for (const [valueLabel, options] of Object.entries(config)) {
    const error = validateJSType({ ...options, valueLabel });
    if (error) {
      errors.push(error.message);
    }
  }
  if (errors.length === 0) return null;
  if (errors.length === 1) return new InvalidJSTypeError(errors[0]);
  return new InvalidJSTypeError(
    `Type errors:\n${errors.map((e) => ` - ${e}`).join("\n")}`,
  );
};
