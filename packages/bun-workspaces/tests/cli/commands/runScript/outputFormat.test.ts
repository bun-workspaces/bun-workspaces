import { test, expect, describe } from "bun:test";
import { assertOutputMatches, setupCliTest } from "../../../util/cliTestUtils";

describe("CLI Run Script (output format)", () => {
  test("Using --no-prefix", async () => {
    const result = await setupCliTest({
      testProject: "simple1",
    }).run("run-script", "all-workspaces", "--no-prefix");
    expect(result.exitCode).toBe(0);
    assertOutputMatches(
      result.stdoutAndErr.sanitizedCompactLines,
      `script for all workspaces
script for all workspaces
script for all workspaces
script for all workspaces
✅ application-1a: all-workspaces
✅ application-1b: all-workspaces
✅ library-1a: all-workspaces
✅ library-1b: all-workspaces
4 scripts ran successfully`,
    );

    const resultShort = await setupCliTest({
      testProject: "simple1",
    }).run("run-script", "all-workspaces", "-N");
    expect(resultShort.exitCode).toBe(0);
    assertOutputMatches(
      resultShort.stdoutAndErr.sanitizedCompactLines,
      `script for all workspaces
script for all workspaces
script for all workspaces
script for all workspaces
✅ application-1a: all-workspaces
✅ application-1b: all-workspaces
✅ library-1a: all-workspaces
✅ library-1b: all-workspaces
4 scripts ran successfully`,
    );

    const resultFailures = await setupCliTest({
      testProject: "runScriptWithFailures",
    }).run("run-script", "test-exit", "--no-prefix");

    expect(resultFailures.exitCode).toBe(1);
    assertOutputMatches(
      resultFailures.stdoutAndErr.sanitizedCompactLines,
      `fail1
fail2
success1
success2
❌ fail1: test-exit (exited with code 1)
❌ fail2: test-exit (exited with code 2)
✅ success1: test-exit
✅ success2: test-exit
2 of 4 scripts failed`,
    );
  });
});
