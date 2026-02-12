import { test, expect, describe } from "bun:test";
import { setupCliTest, assertOutputMatches } from "../../../util/cliTestUtils";

describe("CLI Run Script (workspace patterns)", () => {
  test("Run for specific workspaces", async () => {
    const { run } = setupCliTest({
      testProject: "simple1",
    });

    const resultAll = await run("run-script", "all-workspaces", "*");
    // expect(resultAll.exitCode).toBe(0);
    assertOutputMatches(
      resultAll.stdout.sanitizedCompactLines,
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

    const resultApplication = await run(
      "run-script",
      "all-workspaces",
      "application*",
    );
    expect(resultApplication.exitCode).toBe(0);
    assertOutputMatches(
      resultApplication.stdout.sanitizedCompactLines,
      `[application-1a:all-workspaces] script for all workspaces
[application-1b:all-workspaces] script for all workspaces
✅ application-1a: all-workspaces
✅ application-1b: all-workspaces
2 scripts ran successfully`,
    );

    const resultApplicationsPlusLibrary = await run(
      "run-script",
      "all-workspaces",
      "application*",
      "library-1a",
    );
    expect(resultApplicationsPlusLibrary.exitCode).toBe(0);
    assertOutputMatches(
      resultApplicationsPlusLibrary.stdout.sanitizedCompactLines,
      `[application-1a:all-workspaces] script for all workspaces
[application-1b:all-workspaces] script for all workspaces
[library-1a:all-workspaces] script for all workspaces
✅ application-1a: all-workspaces
✅ application-1b: all-workspaces
✅ library-1a: all-workspaces
3 scripts ran successfully`,
    );

    const result1a = await run("run-script", "all-workspaces", "*1a");
    expect(result1a.exitCode).toBe(0);
    assertOutputMatches(
      result1a.stdout.sanitizedCompactLines,
      `[application-1a:all-workspaces] script for all workspaces
[library-1a:all-workspaces] script for all workspaces
✅ application-1a: all-workspaces
✅ library-1a: all-workspaces
2 scripts ran successfully`,
    );

    const resultNoMatch = await run(
      "run-script",
      "all-workspaces",
      "does-not-exist*",
    );
    expect(resultNoMatch.exitCode).toBe(1);
    assertOutputMatches(
      resultNoMatch.stderr.sanitizedCompactLines,
      `No matching workspaces found with script "all-workspaces"`,
    );

    const resultAliases = await run(
      "run-script",
      "all-workspaces",
      "deprecated_appB",
      "deprecated_libA",
    );
    expect(resultAliases.exitCode).toBe(0);
    assertOutputMatches(
      resultAliases.stdout.sanitizedCompactLines,
      `[application-1b:all-workspaces] script for all workspaces
[library-1a:all-workspaces] script for all workspaces
✅ application-1b: all-workspaces
✅ library-1a: all-workspaces
2 scripts ran successfully`,
    );

    const resultWorkspacePatterns = await run(
      "run-script",
      "all-workspaces",
      "--workspace-patterns=path:applications/* library-1b",
    );
    expect(resultWorkspacePatterns.exitCode).toBe(0);
    assertOutputMatches(
      resultWorkspacePatterns.stdout.sanitizedCompactLines,
      `[application-1a:all-workspaces] script for all workspaces
[application-1b:all-workspaces] script for all workspaces
[library-1b:all-workspaces] script for all workspaces
✅ application-1a: all-workspaces
✅ application-1b: all-workspaces
✅ library-1b: all-workspaces
3 scripts ran successfully`,
    );

    const resultWorkspacePatternsShort = await run(
      "run-script",
      "all-workspaces",
      "-W",
      "path:applications/* library-1b",
    );
    expect(resultWorkspacePatternsShort.exitCode).toBe(0);
    assertOutputMatches(
      resultWorkspacePatternsShort.stdout.sanitizedCompactLines,
      `[application-1a:all-workspaces] script for all workspaces
[application-1b:all-workspaces] script for all workspaces
[library-1b:all-workspaces] script for all workspaces
✅ application-1a: all-workspaces
✅ application-1b: all-workspaces
✅ library-1b: all-workspaces
3 scripts ran successfully`,
    );

    const resultWorkspacePatternsAndOption = await run(
      "run-script",
      "all-workspaces",
      "--workspace-patterns=path:applications/* library-1b",
      "application-*",
      "library-1b",
    );
    expect(resultWorkspacePatternsAndOption.exitCode).toBe(1);
    assertOutputMatches(
      resultWorkspacePatternsAndOption.stderr.sanitizedCompactLines,
      `CLI syntax error: Cannot use both inline workspace patterns and --workspace-patterns|-W option`,
    );
  });
});
