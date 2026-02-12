import { test, expect, describe } from "bun:test";
import { setupCliTest, assertOutputMatches } from "../../../util/cliTestUtils";

describe("CLI Run Script (basic)", () => {
  describe("running script", () => {
    test("runs script in single matching workspace", async () => {
      const { run } = setupCliTest({});
      const result = await run("run", "application-a");
      expect(result.exitCode).toBe(0);
      assertOutputMatches(
        result.stdout.sanitizedCompactLines,
        `[application-a:application-a] script for application-a
✅ application-a: application-a
1 script ran successfully`,
      );
    });

    test("runs script in multiple workspaces", async () => {
      const { run } = setupCliTest({});
      const result = await run("run", "a-workspaces");
      expect(result.exitCode).toBe(0);
      assertOutputMatches(
        result.stdout.sanitizedCompactLines,
        `[application-a:a-workspaces] script for a workspaces
[library-a:a-workspaces] script for a workspaces
✅ application-a: a-workspaces
✅ library-a: a-workspaces
2 scripts ran successfully`,
      );
    });

    test("runs script with workspace patterns filtering workspaces", async () => {
      const { run } = setupCliTest({});
      const result = await run("run", "a-workspaces", "library-a");
      expect(result.exitCode).toBe(0);
      assertOutputMatches(
        result.stdout.sanitizedCompactLines,
        `[library-a:a-workspaces] script for a workspaces
✅ library-a: a-workspaces
1 script ran successfully`,
      );
    });

    test("runs script across all workspaces that have it", async () => {
      const { run } = setupCliTest({});
      const result = await run("run", "all-workspaces");
      expect(result.exitCode).toBe(0);
      assertOutputMatches(
        result.stdout.sanitizedCompactLines,
        `[application-a:all-workspaces] script for all workspaces
[application-b:all-workspaces] script for all workspaces
[library-a:all-workspaces] script for all workspaces
[library-b:all-workspaces] script for all workspaces
[library-c:all-workspaces] script for all workspaces
✅ application-a: all-workspaces
✅ application-b: all-workspaces
✅ library-a: all-workspaces
✅ library-b: all-workspaces
✅ library-c: all-workspaces
5 scripts ran successfully`,
      );
    });
  });

  describe("errors", () => {
    test("errors when no workspaces have script", async () => {
      const { run } = setupCliTest({});
      const result = await run("run", "no-script");
      assertOutputMatches(
        result.stderr.sanitizedCompactLines,
        `No matching workspaces found with script "no-script"`,
      );
    });

    test("errors when workspace name or alias not found", async () => {
      const { run } = setupCliTest({});
      const result = await run("run", "application-a", "does-not-exist");
      assertOutputMatches(
        result.stderr.sanitizedCompactLines,
        `Workspace name or alias not found: "does-not-exist"`,
      );
    });

    test("errors when script not found with valid workspace pattern", async () => {
      const { run } = setupCliTest({});
      const result = await run("run", "does-not-exist", "application-a");
      assertOutputMatches(
        result.stderr.sanitizedCompactLines,
        `No matching workspaces found with script "does-not-exist"`,
      );
    });
  });
});
