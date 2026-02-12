import { test, expect, describe } from "bun:test";
import { assertOutputMatches, setupCliTest } from "../../../util/cliTestUtils";

const NO_PREFIX_ALL_WORKSPACES_OUTPUT = `script for all workspaces
script for all workspaces
script for all workspaces
script for all workspaces
✅ application-1a: all-workspaces
✅ application-1b: all-workspaces
✅ library-1a: all-workspaces
✅ library-1b: all-workspaces
4 scripts ran successfully`;

describe("CLI Run Script (output format)", () => {
  test("--no-prefix strips prefix from script output", async () => {
    const result = await setupCliTest({
      testProject: "simple1",
    }).run("run-script", "all-workspaces", "--no-prefix");
    expect(result.exitCode).toBe(0);
    assertOutputMatches(
      result.stdoutAndErr.sanitizedCompactLines,
      NO_PREFIX_ALL_WORKSPACES_OUTPUT,
    );
  });

  test("-N strips prefix from script output", async () => {
    const result = await setupCliTest({
      testProject: "simple1",
    }).run("run-script", "all-workspaces", "-N");
    expect(result.exitCode).toBe(0);
    assertOutputMatches(
      result.stdoutAndErr.sanitizedCompactLines,
      NO_PREFIX_ALL_WORKSPACES_OUTPUT,
    );
  });

  test("--no-prefix with failures shows failure output", async () => {
    const result = await setupCliTest({
      testProject: "runScriptWithFailures",
    }).run("run-script", "test-exit", "--no-prefix");
    expect(result.exitCode).toBe(1);
    assertOutputMatches(
      result.stdoutAndErr.sanitizedCompactLines,
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
