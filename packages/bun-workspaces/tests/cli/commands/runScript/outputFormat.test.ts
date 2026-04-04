import { test, expect, describe } from "bun:test";
import { assertOutputMatches, setupCliTest } from "../../../util/cliTestUtils";

describe("CLI Run Script (output format)", () => {
  test("--output-style=plain omits prefix from script output", async () => {
    const result = await setupCliTest({
      testProject: "simple1",
    }).run(
      "run-script",
      "all-workspaces",
      "--output-style=plain",
      "--parallel=false",
    );
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
  });

  test("--output-style=plain omits prefix from script output (short arg)", async () => {
    const result = await setupCliTest({
      testProject: "simple1",
    }).run("run-script", "all-workspaces", "-o", "plain", "--parallel=false");
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
  });

  test("--output-style=prefixed", async () => {
    const result = await setupCliTest({
      testProject: "simple1",
    }).run(
      "run-script",
      "all-workspaces",
      "--output-style=prefixed",
      "--parallel=false",
    );
    expect(result.exitCode).toBe(0);
    assertOutputMatches(
      result.stdoutAndErr.sanitizedCompactLines,
      `[application-1a] script for all workspaces
[application-1b] script for all workspaces
[library-1a] script for all workspaces
[library-1b] script for all workspaces
✅ application-1a: all-workspaces
✅ application-1b: all-workspaces
✅ library-1a: all-workspaces
✅ library-1b: all-workspaces
4 scripts ran successfully`,
    );
  });

  test("--output-style=plain with failures shows failure output", async () => {
    const result = await setupCliTest({
      testProject: "runScriptWithFailures",
    }).run(
      "run-script",
      "test-exit",
      "--output-style=plain",
      "--parallel=false",
    );
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

  test("--output-style=none produces no script output", async () => {
    const result = await setupCliTest({
      testProject: "runScriptWithFailures",
    }).run(
      "run-script",
      "test-exit",
      "--output-style=none",
      "--parallel=false",
    );
    expect(result.exitCode).toBe(1);
    assertOutputMatches(
      result.stdoutAndErr.sanitizedCompactLines,
      `❌ fail1: test-exit (exited with code 1)
❌ fail2: test-exit (exited with code 2)
✅ success1: test-exit
✅ success2: test-exit
2 of 4 scripts failed`,
    );
  });

  test("--output-style=none with --log-level=silent produces  output", async () => {
    const result = await setupCliTest({
      testProject: "runScriptWithFailures",
    }).run(
      "--log-level=silent",
      "run-script",
      "test-exit",
      "--output-style=none",
      "--parallel=false",
    );
    expect(result.exitCode).toBe(1);
    assertOutputMatches(result.stdoutAndErr.sanitizedCompactLines, "");
  });

  test("--no-prefix deprecation warning", async () => {
    const result = await setupCliTest({
      testProject: "simple1",
    }).run("run-script", "all-workspaces", "--no-prefix", "--parallel=false");
    expect(result.exitCode).toBe(0);
    assertOutputMatches(
      result.stderr.sanitizedCompactLines,
      `[bun-workspaces WARN]: --no-prefix is deprecated and will be removed in a future version. Use --output-style=plain instead.`,
    );
  });
});
