import { describe, expect, test } from "bun:test";
import type { WorkspaceConfig } from "../../src/config/public";
import { mergeWorkspaceConfig } from "../../src/config/workspaceConfig";

describe("mergeWorkspaceConfig", () => {
  test("returns empty config when called with no arguments", () => {
    expect(mergeWorkspaceConfig()).toEqual({});
  });

  test("returns normalized config when called with a single config", () => {
    expect(mergeWorkspaceConfig({ alias: "my-alias", tags: ["a"] })).toEqual({
      alias: ["my-alias"],
      tags: ["a"],
      scripts: {},
      rules: {},
    });
  });

  describe("alias", () => {
    test("merges string aliases from multiple configs", () => {
      expect(
        mergeWorkspaceConfig({ alias: "a" }, { alias: "b" }),
      ).toMatchObject({ alias: ["a", "b"] });
    });

    test("merges array aliases from multiple configs", () => {
      expect(
        mergeWorkspaceConfig({ alias: ["a", "b"] }, { alias: ["c"] }),
      ).toMatchObject({ alias: ["a", "b", "c"] });
    });

    test("deduplicates aliases across configs", () => {
      expect(
        mergeWorkspaceConfig({ alias: ["a", "b"] }, { alias: ["b", "c"] }),
      ).toMatchObject({ alias: ["a", "b", "c"] });
    });

    test("undefined alias does not clear accumulated aliases", () => {
      expect(
        mergeWorkspaceConfig({ alias: "a" }, { alias: undefined }),
      ).toMatchObject({ alias: ["a"] });
    });
  });

  describe("tags", () => {
    test("concatenates tags from multiple configs", () => {
      expect(
        mergeWorkspaceConfig({ tags: ["a"] }, { tags: ["b"] }),
      ).toMatchObject({ tags: ["a", "b"] });
    });

    test("deduplicates tags across configs", () => {
      expect(
        mergeWorkspaceConfig({ tags: ["a", "b"] }, { tags: ["b", "c"] }),
      ).toMatchObject({ tags: ["a", "b", "c"] });
    });

    test("undefined tags do not clear accumulated tags", () => {
      expect(
        mergeWorkspaceConfig({ tags: ["a"] }, { tags: undefined }),
      ).toMatchObject({ tags: ["a"] });
    });
  });

  describe("scripts", () => {
    test("merges script records from multiple configs", () => {
      expect(
        mergeWorkspaceConfig(
          { scripts: { build: { order: 1 } } },
          { scripts: { lint: { order: 2 } } },
        ),
      ).toMatchObject({ scripts: { build: { order: 1 }, lint: { order: 2 } } });
    });

    test("later config takes precedence for shared script keys", () => {
      expect(
        mergeWorkspaceConfig(
          { scripts: { build: { order: 1 } } },
          { scripts: { build: { order: 5 } } },
        ),
      ).toMatchObject({ scripts: { build: { order: 5 } } });
    });

    test("explicit undefined order in later config overrides earlier value", () => {
      const result = mergeWorkspaceConfig(
        { scripts: { build: { order: 1 } } },
        { scripts: { build: { order: undefined } } },
      );
      expect(result.scripts?.build?.order).toBeUndefined();
    });
  });

  describe("rules", () => {
    test("merges allowPatterns from multiple configs", () => {
      expect(
        mergeWorkspaceConfig(
          { rules: { workspaceDependencies: { allowPatterns: ["a"] } } },
          { rules: { workspaceDependencies: { allowPatterns: ["b"] } } },
        ),
      ).toMatchObject({
        rules: { workspaceDependencies: { allowPatterns: ["a", "b"] } },
      });
    });

    test("deduplicates allowPatterns across configs", () => {
      expect(
        mergeWorkspaceConfig(
          { rules: { workspaceDependencies: { allowPatterns: ["a", "b"] } } },
          { rules: { workspaceDependencies: { allowPatterns: ["b", "c"] } } },
        ),
      ).toMatchObject({
        rules: { workspaceDependencies: { allowPatterns: ["a", "b", "c"] } },
      });
    });

    test("merges denyPatterns from multiple configs", () => {
      expect(
        mergeWorkspaceConfig(
          { rules: { workspaceDependencies: { denyPatterns: ["a"] } } },
          { rules: { workspaceDependencies: { denyPatterns: ["b"] } } },
        ),
      ).toMatchObject({
        rules: { workspaceDependencies: { denyPatterns: ["a", "b"] } },
      });
    });

    test("merges allowPatterns and denyPatterns independently when combined", () => {
      expect(
        mergeWorkspaceConfig(
          {
            rules: { workspaceDependencies: { allowPatterns: ["tag:shared"] } },
          },
          {
            rules: { workspaceDependencies: { denyPatterns: ["tag:backend"] } },
          },
        ),
      ).toMatchObject({
        rules: {
          workspaceDependencies: {
            allowPatterns: ["tag:shared"],
            denyPatterns: ["tag:backend"],
          },
        },
      });
    });

    test("no rules in either config produces empty rules", () => {
      expect(mergeWorkspaceConfig({}, {})).toMatchObject({ rules: {} });
    });
  });

  test("merges more than two configs left to right", () => {
    expect(
      mergeWorkspaceConfig(
        { alias: "a", tags: ["x"] },
        { alias: "b", scripts: { build: { order: 1 } } },
        { alias: "c", tags: ["y"], scripts: { build: { order: 2 } } },
      ),
    ).toEqual({
      alias: ["a", "b", "c"],
      tags: ["x", "y"],
      scripts: { build: { order: 2 } },
      rules: {},
    });
  });

  describe("factory function", () => {
    test("factory receives the accumulated config and its return value is merged", () => {
      expect(
        mergeWorkspaceConfig({ alias: "a", tags: ["x"] }, (prev) => ({
          alias: [...(prev.alias as string[]), "b"],
        })),
      ).toMatchObject({ alias: ["a", "b"], tags: ["x"] });
    });

    test("factory can be used in place of any argument", () => {
      expect(
        mergeWorkspaceConfig((prev) => ({ ...prev, tags: ["injected"] })),
      ).toMatchObject({ tags: ["injected"] });
    });

    test("factory receives intermediate accumulated state in a multi-config chain", () => {
      const seenPrev: WorkspaceConfig[] = [];
      mergeWorkspaceConfig({ alias: "a" }, { tags: ["x"] }, (prev) => {
        seenPrev.push(prev);
        return {};
      });
      expect(seenPrev[0]).toMatchObject({ alias: ["a"], tags: ["x"] });
    });
  });

  test("is exported from the main module", async () => {
    const { mergeWorkspaceConfig: imported } = await import("../../src/index");
    expect(imported).toBe(mergeWorkspaceConfig);
  });
});
