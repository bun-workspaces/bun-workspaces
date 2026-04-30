import { describe, expect, test } from "bun:test";
import { getAffectedWorkspaces } from "../../../src/workspaces/affected";
import { makeTestWorkspace } from "../../util/testData";

const ROOT_DIRECTORY = "/repo";

describe("getAffectedWorkspaces", () => {
  describe("file matching", () => {
    test("matches an exact file path", async () => {
      const workspace = makeTestWorkspace({
        name: "a",
        path: "packages/a",
      });

      const result = await getAffectedWorkspaces({
        rootDirectory: ROOT_DIRECTORY,
        workspaceInputs: [{ workspace, inputFilePatterns: ["src/index.ts"] }],
        changedFilePaths: [
          "packages/a/src/index.ts",
          "packages/a/src/other.ts",
        ],
      });

      expect(result.affectedWorkspaces).toEqual([
        {
          workspace,
          isAffected: true,
          affectedReasons: {
            changedFiles: [
              {
                filePath: "packages/a/src/index.ts",
                inputPattern: "src/index.ts",
              },
            ],
            dependencies: [],
          },
        },
      ]);
    });

    test("matches a directory without a trailing slash as a prefix", async () => {
      const workspace = makeTestWorkspace({ name: "a", path: "packages/a" });

      const result = await getAffectedWorkspaces({
        rootDirectory: ROOT_DIRECTORY,
        workspaceInputs: [{ workspace, inputFilePatterns: ["src"] }],
        changedFilePaths: [
          "packages/a/src/index.ts",
          "packages/a/src/nested/deep.ts",
          "packages/a/other.ts",
        ],
      });

      expect(result.affectedWorkspaces[0].affectedReasons.changedFiles).toEqual(
        [
          { filePath: "packages/a/src/index.ts", inputPattern: "src" },
          { filePath: "packages/a/src/nested/deep.ts", inputPattern: "src" },
        ],
      );
    });

    test("matches a directory with a trailing slash as a prefix", async () => {
      const workspace = makeTestWorkspace({ name: "a", path: "packages/a" });

      const result = await getAffectedWorkspaces({
        rootDirectory: ROOT_DIRECTORY,
        workspaceInputs: [{ workspace, inputFilePatterns: ["src/"] }],
        changedFilePaths: ["packages/a/src/index.ts", "packages/a/other.ts"],
      });

      expect(result.affectedWorkspaces[0].affectedReasons.changedFiles).toEqual(
        [{ filePath: "packages/a/src/index.ts", inputPattern: "src/" }],
      );
    });

    test("matches a glob pattern", async () => {
      const workspace = makeTestWorkspace({ name: "a", path: "packages/a" });

      const result = await getAffectedWorkspaces({
        rootDirectory: ROOT_DIRECTORY,
        workspaceInputs: [{ workspace, inputFilePatterns: ["src/**/*.ts"] }],
        changedFilePaths: [
          "packages/a/src/index.ts",
          "packages/a/src/nested/deep.ts",
          "packages/a/src/index.css",
          "packages/a/README.md",
        ],
      });

      expect(result.affectedWorkspaces[0].affectedReasons.changedFiles).toEqual(
        [
          { filePath: "packages/a/src/index.ts", inputPattern: "src/**/*.ts" },
          {
            filePath: "packages/a/src/nested/deep.ts",
            inputPattern: "src/**/*.ts",
          },
        ],
      );
    });

    test("matches a brace expansion glob", async () => {
      const workspace = makeTestWorkspace({ name: "a", path: "packages/a" });

      const result = await getAffectedWorkspaces({
        rootDirectory: ROOT_DIRECTORY,
        workspaceInputs: [
          { workspace, inputFilePatterns: ["{src,lib}/**/*.ts"] },
        ],
        changedFilePaths: [
          "packages/a/src/x.ts",
          "packages/a/lib/y.ts",
          "packages/a/test/z.ts",
        ],
      });

      expect(result.affectedWorkspaces[0].affectedReasons.changedFiles).toEqual(
        [
          {
            filePath: "packages/a/src/x.ts",
            inputPattern: "{src,lib}/**/*.ts",
          },
          {
            filePath: "packages/a/lib/y.ts",
            inputPattern: "{src,lib}/**/*.ts",
          },
        ],
      );
    });

    test("does not match files outside the workspace path", async () => {
      const workspace = makeTestWorkspace({ name: "a", path: "packages/a" });

      const result = await getAffectedWorkspaces({
        rootDirectory: ROOT_DIRECTORY,
        workspaceInputs: [{ workspace, inputFilePatterns: ["src"] }],
        changedFilePaths: ["packages/b/src/index.ts", "other/file.ts"],
      });

      expect(result.affectedWorkspaces[0].isAffected).toBe(false);
      expect(result.affectedWorkspaces[0].affectedReasons.changedFiles).toEqual(
        [],
      );
    });

    test("matches workspaces independently when paths overlap", async () => {
      const a = makeTestWorkspace({ name: "a", path: "packages/a" });
      const b = makeTestWorkspace({ name: "b", path: "packages/b" });

      const result = await getAffectedWorkspaces({
        rootDirectory: ROOT_DIRECTORY,
        workspaceInputs: [
          { workspace: a, inputFilePatterns: ["src"] },
          { workspace: b, inputFilePatterns: ["src"] },
        ],
        changedFilePaths: ["packages/a/src/x.ts", "packages/b/src/y.ts"],
      });

      expect(result.affectedWorkspaces[0].affectedReasons.changedFiles).toEqual(
        [{ filePath: "packages/a/src/x.ts", inputPattern: "src" }],
      );
      expect(result.affectedWorkspaces[1].affectedReasons.changedFiles).toEqual(
        [{ filePath: "packages/b/src/y.ts", inputPattern: "src" }],
      );
    });

    test("uses the first matching pattern when multiple patterns match a file", async () => {
      const workspace = makeTestWorkspace({ name: "a", path: "packages/a" });

      const result = await getAffectedWorkspaces({
        rootDirectory: ROOT_DIRECTORY,
        workspaceInputs: [
          {
            workspace,
            inputFilePatterns: ["src/index.ts", "src/**/*.ts"],
          },
        ],
        changedFilePaths: ["packages/a/src/index.ts"],
      });

      expect(result.affectedWorkspaces[0].affectedReasons.changedFiles).toEqual(
        [{ filePath: "packages/a/src/index.ts", inputPattern: "src/index.ts" }],
      );
    });

    test("supports multiple input patterns per workspace", async () => {
      const workspace = makeTestWorkspace({ name: "a", path: "packages/a" });

      const result = await getAffectedWorkspaces({
        rootDirectory: ROOT_DIRECTORY,
        workspaceInputs: [
          {
            workspace,
            inputFilePatterns: ["src", "package.json", "config/*.ts"],
          },
        ],
        changedFilePaths: [
          "packages/a/src/x.ts",
          "packages/a/package.json",
          "packages/a/config/dev.ts",
          "packages/a/test/x.ts",
        ],
      });

      expect(result.affectedWorkspaces[0].affectedReasons.changedFiles).toEqual(
        [
          { filePath: "packages/a/src/x.ts", inputPattern: "src" },
          { filePath: "packages/a/package.json", inputPattern: "package.json" },
          { filePath: "packages/a/config/dev.ts", inputPattern: "config/*.ts" },
        ],
      );
    });

    test("treats an empty input pattern as the entire workspace path", async () => {
      const workspace = makeTestWorkspace({ name: "a", path: "packages/a" });

      const result = await getAffectedWorkspaces({
        rootDirectory: ROOT_DIRECTORY,
        workspaceInputs: [{ workspace, inputFilePatterns: [""] }],
        changedFilePaths: [
          "packages/a/src/x.ts",
          "packages/a/README.md",
          "packages/b/x.ts",
        ],
      });

      expect(result.affectedWorkspaces[0].affectedReasons.changedFiles).toEqual(
        [
          { filePath: "packages/a/src/x.ts", inputPattern: "" },
          { filePath: "packages/a/README.md", inputPattern: "" },
        ],
      );
    });

    test("matches files for the root workspace when its path is empty", async () => {
      const root = makeTestWorkspace({
        name: "root",
        isRoot: true,
        path: "",
      });

      const result = await getAffectedWorkspaces({
        rootDirectory: ROOT_DIRECTORY,
        workspaceInputs: [
          {
            workspace: root,
            inputFilePatterns: ["package.json", "scripts/*.ts"],
          },
        ],
        changedFilePaths: [
          "package.json",
          "scripts/build.ts",
          "packages/a/x.ts",
        ],
      });

      expect(result.affectedWorkspaces[0].affectedReasons.changedFiles).toEqual(
        [
          { filePath: "package.json", inputPattern: "package.json" },
          { filePath: "scripts/build.ts", inputPattern: "scripts/*.ts" },
        ],
      );
    });

    test("converts absolute changed file paths to root-relative", async () => {
      const workspace = makeTestWorkspace({ name: "a", path: "packages/a" });

      const result = await getAffectedWorkspaces({
        rootDirectory: "/repo",
        workspaceInputs: [{ workspace, inputFilePatterns: ["src"] }],
        changedFilePaths: ["/repo/packages/a/src/index.ts"],
      });

      expect(result.affectedWorkspaces[0].affectedReasons.changedFiles).toEqual(
        [{ filePath: "packages/a/src/index.ts", inputPattern: "src" }],
      );
    });

    test("ignores absolute changed file paths outside the root directory", async () => {
      const workspace = makeTestWorkspace({ name: "a", path: "packages/a" });

      const result = await getAffectedWorkspaces({
        rootDirectory: "/repo",
        workspaceInputs: [{ workspace, inputFilePatterns: ["src"] }],
        changedFilePaths: ["/elsewhere/packages/a/src/index.ts"],
      });

      expect(result.affectedWorkspaces[0].isAffected).toBe(false);
    });

    test("handles a trailing slash on the root directory", async () => {
      const workspace = makeTestWorkspace({ name: "a", path: "packages/a" });

      const result = await getAffectedWorkspaces({
        rootDirectory: "/repo/",
        workspaceInputs: [{ workspace, inputFilePatterns: ["src"] }],
        changedFilePaths: ["/repo/packages/a/src/index.ts"],
      });

      expect(result.affectedWorkspaces[0].affectedReasons.changedFiles).toEqual(
        [{ filePath: "packages/a/src/index.ts", inputPattern: "src" }],
      );
    });
  });

  describe("dependency propagation", () => {
    test("marks a workspace as affected via a direct dependency", async () => {
      const dep = makeTestWorkspace({
        name: "dep",
        path: "packages/dep",
        dependents: ["app"],
      });
      const app = makeTestWorkspace({
        name: "app",
        path: "packages/app",
        dependencies: ["dep"],
      });

      const result = await getAffectedWorkspaces({
        rootDirectory: ROOT_DIRECTORY,
        workspaceInputs: [
          { workspace: dep, inputFilePatterns: ["src"] },
          { workspace: app, inputFilePatterns: ["src"] },
        ],
        changedFilePaths: ["packages/dep/src/x.ts"],
      });

      expect(result.affectedWorkspaces).toEqual([
        {
          workspace: dep,
          isAffected: true,
          affectedReasons: {
            changedFiles: [
              { filePath: "packages/dep/src/x.ts", inputPattern: "src" },
            ],
            dependencies: [],
          },
        },
        {
          workspace: app,
          isAffected: true,
          affectedReasons: {
            changedFiles: [],
            dependencies: [{ dependencyName: "dep", chain: ["app", "dep"] }],
          },
        },
      ]);
    });

    test("propagates affected status through transitive dependencies with full chain", async () => {
      const c = makeTestWorkspace({
        name: "c",
        path: "packages/c",
        dependents: ["b"],
      });
      const b = makeTestWorkspace({
        name: "b",
        path: "packages/b",
        dependencies: ["c"],
        dependents: ["a"],
      });
      const a = makeTestWorkspace({
        name: "a",
        path: "packages/a",
        dependencies: ["b"],
      });

      const result = await getAffectedWorkspaces({
        rootDirectory: ROOT_DIRECTORY,
        workspaceInputs: [
          { workspace: a, inputFilePatterns: ["src"] },
          { workspace: b, inputFilePatterns: ["src"] },
          { workspace: c, inputFilePatterns: ["src"] },
        ],
        changedFilePaths: ["packages/c/src/x.ts"],
      });

      expect(result.affectedWorkspaces[0]).toEqual({
        workspace: a,
        isAffected: true,
        affectedReasons: {
          changedFiles: [],
          dependencies: [{ dependencyName: "c", chain: ["a", "b", "c"] }],
        },
      });
      expect(result.affectedWorkspaces[1].affectedReasons.dependencies).toEqual(
        [{ dependencyName: "c", chain: ["b", "c"] }],
      );
      expect(result.affectedWorkspaces[2].affectedReasons.dependencies).toEqual(
        [],
      );
    });

    test("includes every directly-affected dependency reachable from the workspace", async () => {
      const c = makeTestWorkspace({
        name: "c",
        path: "packages/c",
        dependents: ["a"],
      });
      const d = makeTestWorkspace({
        name: "d",
        path: "packages/d",
        dependents: ["a"],
      });
      const a = makeTestWorkspace({
        name: "a",
        path: "packages/a",
        dependencies: ["c", "d"],
      });

      const result = await getAffectedWorkspaces({
        rootDirectory: ROOT_DIRECTORY,
        workspaceInputs: [
          { workspace: a, inputFilePatterns: ["src"] },
          { workspace: c, inputFilePatterns: ["src"] },
          { workspace: d, inputFilePatterns: ["src"] },
        ],
        changedFilePaths: ["packages/c/src/x.ts", "packages/d/src/y.ts"],
      });

      expect(result.affectedWorkspaces[0].affectedReasons.dependencies).toEqual(
        [
          { dependencyName: "c", chain: ["a", "c"] },
          { dependencyName: "d", chain: ["a", "d"] },
        ],
      );
    });

    test("only lists dependencies whose own files changed, not unaffected intermediate links", async () => {
      const c = makeTestWorkspace({
        name: "c",
        path: "packages/c",
        dependents: ["b"],
      });
      const b = makeTestWorkspace({
        name: "b",
        path: "packages/b",
        dependencies: ["c"],
        dependents: ["a"],
      });
      const a = makeTestWorkspace({
        name: "a",
        path: "packages/a",
        dependencies: ["b"],
      });

      const result = await getAffectedWorkspaces({
        rootDirectory: ROOT_DIRECTORY,
        workspaceInputs: [
          { workspace: a, inputFilePatterns: ["src"] },
          { workspace: b, inputFilePatterns: ["src"] },
          { workspace: c, inputFilePatterns: ["src"] },
        ],
        changedFilePaths: ["packages/c/src/x.ts"],
      });

      expect(result.affectedWorkspaces[0].affectedReasons.dependencies).toEqual(
        [{ dependencyName: "c", chain: ["a", "b", "c"] }],
      );
    });

    test("ignoreDependencies skips dependency propagation", async () => {
      const dep = makeTestWorkspace({
        name: "dep",
        path: "packages/dep",
        dependents: ["app"],
      });
      const app = makeTestWorkspace({
        name: "app",
        path: "packages/app",
        dependencies: ["dep"],
      });

      const result = await getAffectedWorkspaces({
        rootDirectory: ROOT_DIRECTORY,
        workspaceInputs: [
          { workspace: dep, inputFilePatterns: ["src"] },
          { workspace: app, inputFilePatterns: ["src"] },
        ],
        changedFilePaths: ["packages/dep/src/x.ts"],
        ignoreDependencies: true,
      });

      expect(result.affectedWorkspaces[0].isAffected).toBe(true);
      expect(result.affectedWorkspaces[1].isAffected).toBe(false);
      expect(result.affectedWorkspaces[1].affectedReasons.dependencies).toEqual(
        [],
      );
    });

    test("dependency cycles do not cause infinite recursion", async () => {
      const a = makeTestWorkspace({
        name: "a",
        path: "packages/a",
        dependencies: ["b"],
        dependents: ["c"],
      });
      const b = makeTestWorkspace({
        name: "b",
        path: "packages/b",
        dependencies: ["c"],
        dependents: ["a"],
      });
      const c = makeTestWorkspace({
        name: "c",
        path: "packages/c",
        dependencies: ["a"],
        dependents: ["b"],
      });

      const result = await getAffectedWorkspaces({
        rootDirectory: ROOT_DIRECTORY,
        workspaceInputs: [
          { workspace: a, inputFilePatterns: ["src"] },
          { workspace: b, inputFilePatterns: ["src"] },
          { workspace: c, inputFilePatterns: ["src"] },
        ],
        changedFilePaths: ["packages/b/src/x.ts"],
      });

      expect(result.affectedWorkspaces[0].affectedReasons.dependencies).toEqual(
        [{ dependencyName: "b", chain: ["a", "b"] }],
      );
      expect(result.affectedWorkspaces[1].affectedReasons.dependencies).toEqual(
        [],
      );
      expect(result.affectedWorkspaces[2].affectedReasons.dependencies).toEqual(
        [{ dependencyName: "b", chain: ["c", "a", "b"] }],
      );
    });

    test("dependencies that are not in workspaceInputs are skipped", async () => {
      const app = makeTestWorkspace({
        name: "app",
        path: "packages/app",
        dependencies: ["external-not-in-inputs"],
      });

      const result = await getAffectedWorkspaces({
        rootDirectory: ROOT_DIRECTORY,
        workspaceInputs: [{ workspace: app, inputFilePatterns: ["src"] }],
        changedFilePaths: ["packages/app/src/x.ts"],
      });

      expect(result.affectedWorkspaces[0].isAffected).toBe(true);
      expect(result.affectedWorkspaces[0].affectedReasons.dependencies).toEqual(
        [],
      );
    });
  });

  describe("edge cases", () => {
    test("returns an empty result for empty workspaceInputs", async () => {
      const result = await getAffectedWorkspaces({
        rootDirectory: ROOT_DIRECTORY,
        workspaceInputs: [],
        changedFilePaths: ["packages/a/src/x.ts"],
      });

      expect(result.affectedWorkspaces).toEqual([]);
    });

    test("returns isAffected=false when there are no changed files", async () => {
      const workspace = makeTestWorkspace({ name: "a", path: "packages/a" });

      const result = await getAffectedWorkspaces({
        rootDirectory: ROOT_DIRECTORY,
        workspaceInputs: [{ workspace, inputFilePatterns: ["src"] }],
        changedFilePaths: [],
      });

      expect(result.affectedWorkspaces[0]).toEqual({
        workspace,
        isAffected: false,
        affectedReasons: {
          changedFiles: [],
          dependencies: [],
        },
      });
    });

    test("a workspace with empty inputPatterns is not directly affected by file changes", async () => {
      const workspace = makeTestWorkspace({ name: "a", path: "packages/a" });

      const result = await getAffectedWorkspaces({
        rootDirectory: ROOT_DIRECTORY,
        workspaceInputs: [{ workspace, inputFilePatterns: [] }],
        changedFilePaths: ["packages/a/src/x.ts"],
      });

      expect(result.affectedWorkspaces[0].isAffected).toBe(false);
      expect(result.affectedWorkspaces[0].affectedReasons.changedFiles).toEqual(
        [],
      );
    });

    test("a workspace with empty inputPatterns can still be affected via dependencies", async () => {
      const dep = makeTestWorkspace({
        name: "dep",
        path: "packages/dep",
        dependents: ["app"],
      });
      const app = makeTestWorkspace({
        name: "app",
        path: "packages/app",
        dependencies: ["dep"],
      });

      const result = await getAffectedWorkspaces({
        rootDirectory: ROOT_DIRECTORY,
        workspaceInputs: [
          { workspace: dep, inputFilePatterns: ["src"] },
          { workspace: app, inputFilePatterns: [] },
        ],
        changedFilePaths: ["packages/dep/src/x.ts"],
      });

      expect(result.affectedWorkspaces[1].isAffected).toBe(true);
      expect(result.affectedWorkspaces[1].affectedReasons.dependencies).toEqual(
        [{ dependencyName: "dep", chain: ["app", "dep"] }],
      );
    });

    test("dedupes a file matched by multiple patterns into a single entry", async () => {
      const workspace = makeTestWorkspace({ name: "a", path: "packages/a" });

      const result = await getAffectedWorkspaces({
        rootDirectory: ROOT_DIRECTORY,
        workspaceInputs: [
          { workspace, inputFilePatterns: ["src/**/*.ts", "src"] },
        ],
        changedFilePaths: ["packages/a/src/x.ts"],
      });

      expect(result.affectedWorkspaces[0].affectedReasons.changedFiles).toEqual(
        [{ filePath: "packages/a/src/x.ts", inputPattern: "src/**/*.ts" }],
      );
    });
  });
});
