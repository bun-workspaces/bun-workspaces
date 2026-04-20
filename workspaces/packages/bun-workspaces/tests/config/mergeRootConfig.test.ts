import { describe, expect, test } from "bun:test";
import type { RootConfig } from "bw-common";
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

  describe("factory function", () => {
    test("factory receives the accumulated config and its return value is merged", () => {
      expect(
        mergeRootConfig(
          { defaults: { parallelMax: 4, shell: "system" } },
          (prev) => ({ defaults: { ...prev.defaults, parallelMax: 8 } }),
        ),
      ).toEqual({ defaults: { parallelMax: 8, shell: "system" } });
    });

    test("factory can be used in place of any argument", () => {
      expect(
        mergeRootConfig((prev) => ({
          defaults: { ...prev.defaults, parallelMax: 4 },
        })),
      ).toEqual({ defaults: { parallelMax: 4 } });
    });

    test("factory receives intermediate accumulated state in a multi-config chain", () => {
      const seenPrev: RootConfig[] = [];
      mergeRootConfig(
        { defaults: { parallelMax: 2 } },
        { defaults: { shell: "system" } },
        (prev) => {
          seenPrev.push(prev);
          return {};
        },
      );
      expect(seenPrev[0]).toEqual({
        defaults: { parallelMax: 2, shell: "system" },
      });
    });
  });

  describe("workspacePatternConfigs", () => {
    test("entries from two configs are concatenated in order", () => {
      const entry1 = { patterns: ["a"], config: { tags: ["x"] } };
      const entry2 = { patterns: ["b"], config: { tags: ["y"] } };
      expect(
        mergeRootConfig(
          { workspacePatternConfigs: [entry1] },
          { workspacePatternConfigs: [entry2] },
        ),
      ).toMatchObject({ workspacePatternConfigs: [entry1, entry2] });
    });

    test("entries from three configs are concatenated left to right", () => {
      const entry1 = { patterns: ["a"], config: {} };
      const entry2 = { patterns: ["b"], config: {} };
      const entry3 = { patterns: ["c"], config: {} };
      const { workspacePatternConfigs } = mergeRootConfig(
        { workspacePatternConfigs: [entry1] },
        { workspacePatternConfigs: [entry2] },
        { workspacePatternConfigs: [entry3] },
      );
      expect(workspacePatternConfigs).toEqual([entry1, entry2, entry3]);
    });

    test("config with no workspacePatternConfigs does not clear accumulated entries", () => {
      const entry1 = { patterns: ["a"], config: {} };
      expect(
        mergeRootConfig(
          { workspacePatternConfigs: [entry1] },
          { defaults: { parallelMax: 4 } },
        ),
      ).toMatchObject({ workspacePatternConfigs: [entry1] });
    });

    test("workspacePatternConfigs is absent from result when neither config has entries", () => {
      const result = mergeRootConfig(
        { defaults: { parallelMax: 4 } },
        { defaults: { shell: "system" } },
      );
      expect(result.workspacePatternConfigs).toBeUndefined();
    });
  });

  test("is exported from the main module", async () => {
    const { mergeRootConfig: imported } = await import("../../src/index");
    expect(imported).toBe(mergeRootConfig);
  });
});
