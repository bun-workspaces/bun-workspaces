import { describe, expect, test } from "bun:test";
import { mergeRootConfig } from "../../src/config/rootConfig";

describe("mergeRootConfig", () => {
  test("returns empty config when called with no arguments", () => {
    expect(mergeRootConfig()).toEqual({});
  });

  test("returns the config unchanged when called with a single config", () => {
    expect(mergeRootConfig({ defaults: { parallelMax: 4 } })).toEqual({
      defaults: { parallelMax: 4 },
    });
  });

  test("second config takes precedence over first for shared fields", () => {
    expect(
      mergeRootConfig(
        { defaults: { parallelMax: 4 } },
        { defaults: { parallelMax: 8 } },
      ),
    ).toEqual({ defaults: { parallelMax: 8 } });
  });

  test("fields not present in later configs are kept from earlier configs", () => {
    expect(
      mergeRootConfig(
        { defaults: { parallelMax: 4, shell: "system" } },
        { defaults: { parallelMax: 8 } },
      ),
    ).toEqual({ defaults: { parallelMax: 8, shell: "system" } });
  });

  test("merges all three defaults fields across two configs", () => {
    expect(
      mergeRootConfig(
        { defaults: { parallelMax: 4, shell: "system" } },
        { defaults: { includeRootWorkspace: true } },
      ),
    ).toEqual({
      defaults: { parallelMax: 4, shell: "system", includeRootWorkspace: true },
    });
  });

  test("merges more than two configs left to right", () => {
    expect(
      mergeRootConfig(
        { defaults: { parallelMax: 2 } },
        { defaults: { parallelMax: 4, shell: "bun" } },
        { defaults: { shell: "system", includeRootWorkspace: true } },
      ),
    ).toEqual({
      defaults: {
        parallelMax: 4,
        shell: "system",
        includeRootWorkspace: true,
      },
    });
  });

  test("empty config in chain does not overwrite existing fields", () => {
    expect(mergeRootConfig({ defaults: { parallelMax: 4 } }, {})).toEqual({
      defaults: { parallelMax: 4 },
    });
  });

  test("explicit undefined in later config overrides earlier value", () => {
    expect(
      mergeRootConfig(
        { defaults: { parallelMax: 4 } },
        { defaults: { parallelMax: undefined } },
      ),
    ).toEqual({ defaults: { parallelMax: undefined } });
  });

  test("is exported from the main module", async () => {
    const { mergeRootConfig: imported } = await import("../../src/index");
    expect(imported).toBe(mergeRootConfig);
  });
});
