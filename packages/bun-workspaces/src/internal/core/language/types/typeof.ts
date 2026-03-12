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

export type ValidateJSTypeConfig = {
  /** For use in error message */
  valueLabel?: string;
  numberRules?: ValidateNumberRules;
};

export type ValidateObjectJSTypesConfig = {
  [key: string]: ValidateJSTypeConfig & { value: unknown };
};

export const validateNumber = (
  value: number,
  rules: ValidateNumberRules,
  valueLabel = "Number",
): InstanceType<typeof InvalidJSNumberError> | null => {
  if (Number.isNaN(value) && rules?.noNaN) {
    return new InvalidJSNumberError(`${valueLabel} cannot be NaN`);
  } else if (!Number.isFinite(value) && rules?.noNonFinite) {
    return new InvalidJSNumberError(`${valueLabel} cannot be non-finite`);
  } else if (value === Infinity && rules?.noInfinity) {
    return new InvalidJSNumberError(`${valueLabel} cannot be Infinity`);
  } else if (value === -Infinity && rules?.noNegInfinity) {
    return new InvalidJSNumberError(`${valueLabel} cannot be -Infinity`);
  }
  return null;
};

export const validateJSType = <T = unknown>(
  value: T,
  typeofName: OptionalArray<JSDataTypeofName>,
  { numberRules, valueLabel }: ValidateJSTypeConfig = {},
): InstanceType<typeof InvalidJSTypeError> | null => {
  const typeofNames = resolveOptionalArray(typeofName);

  const isValid = isTypeof(value, ...typeofNames);
  if (isValid && typeof value === "number" && numberRules) {
    return validateNumber(value, numberRules, valueLabel);
  } else if (isValid && typeof value === "object" && value === null) {
    return new InvalidJSTypeError(`${valueLabel ?? "Value"} cannot be null`);
  } else if (!isValid) {
    return new InvalidJSTypeError(
      `Invalid type: ${valueLabel ?? "Value"} expects type ${typeofNames.join(" | ")}, received ${
        value === null ? "null" : typeof value
      }`,
    );
  }

  return null;
};
