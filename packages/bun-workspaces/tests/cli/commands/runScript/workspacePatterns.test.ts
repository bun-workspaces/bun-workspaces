import { test, expect, describe } from "bun:test";
import { setupCliTest, assertOutputMatches } from "../../../util/cliTestUtils";

describe("CLI Run Script (workspace patterns)", () => {
  describe("inline workspace patterns", () => {
    test("pattern * matches all workspaces", async () => {
      const { run } = setupCliTest({ testProject: "simple1" });
      const result = await run("run-script", "all-workspaces", "*");
      expect(result.exitCode).toBe(0);
      assertOutputMatches(
        result.stdout.sanitizedCompactLines,
        `[application-1a:all-workspaces] script for all workspaces
[application-1b:all-workspaces] script for all workspaces
[library-1a:all-workspaces] script for all workspaces
[library-1b:all-workspaces] script for all workspaces
✅ application-1a: all-workspaces
✅ application-1b: all-workspaces
✅ library-1a: all-workspaces
✅ library-1b: all-workspaces
4 scripts ran successfully`,
      );
    });

    test("pattern application* matches application workspaces", async () => {
      const { run } = setupCliTest({ testProject: "simple1" });
      const result = await run("run-script", "all-workspaces", "application*");
      expect(result.exitCode).toBe(0);
      assertOutputMatches(
        result.stdout.sanitizedCompactLines,
        `[application-1a:all-workspaces] script for all workspaces
[application-1b:all-workspaces] script for all workspaces
✅ application-1a: all-workspaces
✅ application-1b: all-workspaces
2 scripts ran successfully`,
      );
    });

    test("multiple patterns match union", async () => {
      const { run } = setupCliTest({ testProject: "simple1" });
      const result = await run(
        "run-script",
        "all-workspaces",
        "application*",
        "library-1a",
      );
      expect(result.exitCode).toBe(0);
      assertOutputMatches(
        result.stdout.sanitizedCompactLines,
        `[application-1a:all-workspaces] script for all workspaces
[application-1b:all-workspaces] script for all workspaces
[library-1a:all-workspaces] script for all workspaces
✅ application-1a: all-workspaces
✅ application-1b: all-workspaces
✅ library-1a: all-workspaces
3 scripts ran successfully`,
      );
    });

    test("pattern *1a matches by name suffix", async () => {
      const { run } = setupCliTest({ testProject: "simple1" });
      const result = await run("run-script", "all-workspaces", "*1a");
      expect(result.exitCode).toBe(0);
      assertOutputMatches(
        result.stdout.sanitizedCompactLines,
        `[application-1a:all-workspaces] script for all workspaces
[library-1a:all-workspaces] script for all workspaces
✅ application-1a: all-workspaces
✅ library-1a: all-workspaces
2 scripts ran successfully`,
      );
    });

    test("no match exits with error", async () => {
      const { run } = setupCliTest({ testProject: "simple1" });
      const result = await run(
        "run-script",
        "all-workspaces",
        "does-not-exist*",
      );
      expect(result.exitCode).toBe(1);
      assertOutputMatches(
        result.stderr.sanitizedCompactLines,
        `No matching workspaces found with script "all-workspaces"`,
      );
    });

    test("aliases match workspaces", async () => {
      const { run } = setupCliTest({ testProject: "simple1" });
      const result = await run(
        "run-script",
        "all-workspaces",
        "deprecated_appB",
        "deprecated_libA",
      );
      expect(result.exitCode).toBe(0);
      assertOutputMatches(
        result.stdout.sanitizedCompactLines,
        `[application-1b:all-workspaces] script for all workspaces
[library-1a:all-workspaces] script for all workspaces
✅ application-1b: all-workspaces
✅ library-1a: all-workspaces
2 scripts ran successfully`,
      );
    });
  });

  describe("--workspace-patterns / -W", () => {
    test("--workspace-patterns filters workspaces", async () => {
      const { run } = setupCliTest({ testProject: "simple1" });
      const result = await run(
        "run-script",
        "all-workspaces",
        "--workspace-patterns=path:applications/* library-1b",
      );
      expect(result.exitCode).toBe(0);
      assertOutputMatches(
        result.stdout.sanitizedCompactLines,
        `[application-1a:all-workspaces] script for all workspaces
[application-1b:all-workspaces] script for all workspaces
[library-1b:all-workspaces] script for all workspaces
✅ application-1a: all-workspaces
✅ application-1b: all-workspaces
✅ library-1b: all-workspaces
3 scripts ran successfully`,
      );
    });

    test("-W filters workspaces", async () => {
      const { run } = setupCliTest({ testProject: "simple1" });
      const result = await run(
        "run-script",
        "all-workspaces",
        "-W",
        "path:applications/* library-1b",
      );
      expect(result.exitCode).toBe(0);
      assertOutputMatches(
        result.stdout.sanitizedCompactLines,
        `[application-1a:all-workspaces] script for all workspaces
[application-1b:all-workspaces] script for all workspaces
[library-1b:all-workspaces] script for all workspaces
✅ application-1a: all-workspaces
✅ application-1b: all-workspaces
✅ library-1b: all-workspaces
3 scripts ran successfully`,
      );
    });
  });

  test("errors when both inline patterns and --workspace-patterns used", async () => {
    const { run } = setupCliTest({ testProject: "simple1" });
    const result = await run(
      "run-script",
      "all-workspaces",
      "--workspace-patterns=path:applications/* library-1b",
      "application-*",
      "library-1b",
    );
    expect(result.exitCode).toBe(1);
    assertOutputMatches(
      result.stderr.sanitizedCompactLines,
      "CLI syntax error: Cannot use both inline workspace patterns and --workspace-patterns|-W option",
    );
  });
});
