import { test, expect, describe } from "bun:test";
import { setupCliTest, assertOutputMatches } from "../../../util/cliTestUtils";

describe("CLI ", () => {
  test("Script option vs. inline script name", async () => {
    const { run } = setupCliTest({
      testProject: "simple1",
    });

    const optionResult = await run("run-script", "--script=a-workspaces");
    expect(optionResult.exitCode).toBe(0);
    assertOutputMatches(
      optionResult.stdoutAndErr.sanitizedCompactLines,
      `[application-1a:a-workspaces] script for a workspaces
[library-1a:a-workspaces] script for a workspaces
✅ application-1a: a-workspaces
✅ library-1a: a-workspaces
2 scripts ran successfully`,
    );

    const shortOptionResult = await run("run-script", "-S", "a-workspaces");
    expect(shortOptionResult.exitCode).toBe(0);
    assertOutputMatches(
      shortOptionResult.stdoutAndErr.sanitizedCompactLines,
      `[application-1a:a-workspaces] script for a workspaces
[library-1a:a-workspaces] script for a workspaces
✅ application-1a: a-workspaces
✅ library-1a: a-workspaces
2 scripts ran successfully`,
    );

    const inlineResult = await run("run-script", "a-workspaces");
    expect(inlineResult.exitCode).toBe(0);
    assertOutputMatches(
      inlineResult.stdoutAndErr.sanitizedCompactLines,
      `[application-1a:a-workspaces] script for a workspaces
[library-1a:a-workspaces] script for a workspaces
✅ application-1a: a-workspaces
✅ library-1a: a-workspaces
2 scripts ran successfully`,
    );

    const inlinePatternsResult = await run(
      "run-script",
      "--script=a-workspaces",
      "application-*",
    );
    expect(inlinePatternsResult.exitCode).toBe(0);
    assertOutputMatches(
      inlinePatternsResult.stdout.sanitizedCompactLines,
      `[application-1a:a-workspaces] script for a workspaces
✅ application-1a: a-workspaces
1 script ran successfully`,
    );

    const inlinePatternsResult2 = await run(
      "run-script",
      "--script=all-workspaces",
      "library-1a",
      "library-*",
    );
    expect(inlinePatternsResult2.exitCode).toBe(0);
    assertOutputMatches(
      inlinePatternsResult2.stdout.sanitizedCompactLines,
      `[library-1a:all-workspaces] script for all workspaces
[library-1b:all-workspaces] script for all workspaces
✅ library-1a: all-workspaces
✅ library-1b: all-workspaces
2 scripts ran successfully`,
    );

    const scriptAndWorkspaceOptionResult = await run(
      "run-script",
      "--workspace-patterns=library-1a library-*",
      "--script=all-workspaces",
    );
    expect(scriptAndWorkspaceOptionResult.exitCode).toBe(0);
    assertOutputMatches(
      scriptAndWorkspaceOptionResult.stdout.sanitizedCompactLines,
      `[library-1a:all-workspaces] script for all workspaces
[library-1b:all-workspaces] script for all workspaces
✅ library-1a: all-workspaces
✅ library-1b: all-workspaces
2 scripts ran successfully`,
    );

    const scriptAndWorkspaceOptionAndScriptOptionResult = await run(
      "run-script",
      "all-workspaces",
      "--workspace-patterns=library-1a library-*",
      "--script=all-workspaces",
    );
    expect(scriptAndWorkspaceOptionAndScriptOptionResult.exitCode).toBe(1);
    assertOutputMatches(
      scriptAndWorkspaceOptionAndScriptOptionResult.stderr
        .sanitizedCompactLines,
      `CLI syntax error: Cannot use both inline workspace patterns and --workspace-patterns|-W option`,
    );
  });
});
