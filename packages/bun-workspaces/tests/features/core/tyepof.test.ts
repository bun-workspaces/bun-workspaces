import { describe, test, expect } from "bun:test";
import {
  isTypeof,
  validateNumber,
  validateJSType,
  InvalidJSTypeError,
  InvalidJSNumberError,
} from "../../../src/internal/core/language/types/typeof";

describe("isTypeof", () => {
  test("matches each JS typeof value", () => {
    expect(isTypeof("hello", "string")).toBe(true);
    expect(isTypeof(42, "number")).toBe(true);
    expect(isTypeof(true, "boolean")).toBe(true);
    expect(isTypeof(undefined, "undefined")).toBe(true);
    expect(isTypeof(42n, "bigint")).toBe(true);
    expect(isTypeof(() => {}, "function")).toBe(true);
    expect(isTypeof({}, "object")).toBe(true);
    expect(isTypeof(null, "object")).toBe(true);
    expect(isTypeof(Symbol(), "symbol")).toBe(true);
  });

  test("returns false for non-matching type", () => {
    expect(isTypeof("hello", "number")).toBe(false);
    expect(isTypeof(42, "string")).toBe(false);
    expect(isTypeof(null, "string")).toBe(false);
    expect(isTypeof(undefined, "object")).toBe(false);
  });

  test("accepts an array of types and returns true if any match", () => {
    expect(isTypeof("hello", "string", "number")).toBe(true);
    expect(isTypeof(42, "string", "number")).toBe(true);
    expect(isTypeof(true, "string", "number")).toBe(false);
    expect(isTypeof("hello", "string", "object")).toBe(true);
    expect(isTypeof(null, "string", "object")).toBe(true);
  });
});

describe("validateNumber", () => {
  test("returns null for a plain valid number", () => {
    expect(validateNumber(42, {})).toBeNull();
    expect(validateNumber(0, {})).toBeNull();
    expect(validateNumber(-1, {})).toBeNull();
    expect(validateNumber(3.14, {})).toBeNull();
  });

  test("noNaN: returns error for NaN, null for valid", () => {
    const error = validateNumber(NaN, { noNaN: true });
    expect(error).toBeInstanceOf(InvalidJSNumberError);
    expect(error?.message).toInclude("NaN");
    expect(validateNumber(42, { noNaN: true })).toBeNull();
  });

  test("noNonFinite: returns error for NaN, Infinity, and -Infinity", () => {
    expect(validateNumber(NaN, { noNonFinite: true })).toBeInstanceOf(
      InvalidJSNumberError,
    );
    expect(validateNumber(Infinity, { noNonFinite: true })).toBeInstanceOf(
      InvalidJSNumberError,
    );
    expect(validateNumber(-Infinity, { noNonFinite: true })).toBeInstanceOf(
      InvalidJSNumberError,
    );
    expect(validateNumber(42, { noNonFinite: true })).toBeNull();
  });

  test("noInfinity: returns error only for positive Infinity", () => {
    expect(validateNumber(Infinity, { noInfinity: true })).toBeInstanceOf(
      InvalidJSNumberError,
    );
    expect(validateNumber(-Infinity, { noInfinity: true })).toBeNull();
    expect(validateNumber(42, { noInfinity: true })).toBeNull();
  });

  test("noNegInfinity: returns error only for -Infinity", () => {
    expect(validateNumber(-Infinity, { noNegInfinity: true })).toBeInstanceOf(
      InvalidJSNumberError,
    );
    expect(validateNumber(Infinity, { noNegInfinity: true })).toBeNull();
    expect(validateNumber(42, { noNegInfinity: true })).toBeNull();
  });

  test("noNaN takes precedence over noNonFinite for NaN", () => {
    const error = validateNumber(NaN, { noNaN: true, noNonFinite: true });
    expect(error).toBeInstanceOf(InvalidJSNumberError);
    expect(error?.message).toInclude("NaN");
  });

  test("valueLabel is included in error message", () => {
    const error = validateNumber(NaN, { noNaN: true }, "myParam");
    expect(error?.message).toInclude("myParam");
  });

  test("default valueLabel is 'Number'", () => {
    const error = validateNumber(NaN, { noNaN: true });
    expect(error?.message).toInclude("Number");
  });
});

describe("validateJSType", () => {
  test("returns null for each valid JS type", () => {
    expect(validateJSType("hello", "string")).toBeNull();
    expect(validateJSType(42, "number")).toBeNull();
    expect(validateJSType(true, "boolean")).toBeNull();
    expect(validateJSType(undefined, "undefined")).toBeNull();
    expect(validateJSType(42n, "bigint")).toBeNull();
    expect(validateJSType(() => {}, "function")).toBeNull();
    expect(validateJSType({}, "object")).toBeNull();
    expect(validateJSType(Symbol(), "symbol")).toBeNull();
  });

  test("returns InvalidJSTypeError for wrong type", () => {
    const error = validateJSType("hello", "number");
    expect(error).toBeInstanceOf(InvalidJSTypeError);
    expect(error?.message).toInclude("string");
    expect(error?.message).toInclude("number");
  });

  test("returns InvalidJSTypeError for null even when type is 'object'", () => {
    const error = validateJSType(null, "object");
    expect(error).toBeInstanceOf(InvalidJSTypeError);
    expect(error?.message).toInclude("null");
  });

  test("accepts an array of types", () => {
    expect(validateJSType("hello", ["string", "number"])).toBeNull();
    expect(validateJSType(42, ["string", "number"])).toBeNull();
    const error = validateJSType(true, ["string", "number"]);
    expect(error).toBeInstanceOf(InvalidJSTypeError);
    expect(error?.message).toInclude("string | number");
  });

  test("applies numberRules when type is number", () => {
    const error = validateJSType(NaN, "number", { numberRules: { noNaN: true } });
    expect(error).toBeInstanceOf(InvalidJSNumberError);
    expect(error?.message).toInclude("NaN");
    expect(validateJSType(42, "number", { numberRules: { noNaN: true } })).toBeNull();
  });

  test("does not apply numberRules for non-number values that match type", () => {
    expect(validateJSType("hello", ["string", "number"], { numberRules: { noNaN: true } })).toBeNull();
    expect(validateJSType(42, ["string", "number"], { numberRules: { noNaN: true } })).toBeNull();
  });

  test("valueLabel appears in type mismatch error message", () => {
    const error = validateJSType(42, "string", { valueLabel: "myOption" });
    expect(error?.message).toInclude("myOption");
  });

  test("valueLabel appears in null error message", () => {
    const error = validateJSType(null, "object", { valueLabel: "myOption" });
    expect(error?.message).toInclude("myOption");
  });

  test("default valueLabel is 'Value'", () => {
    const error = validateJSType(null, "object");
    expect(error?.message).toInclude("Value");
  });

  test("error name is 'InvalidJSType'", () => {
    const error = validateJSType(42, "string");
    expect(error?.name).toBe("InvalidJSType");
  });
});
