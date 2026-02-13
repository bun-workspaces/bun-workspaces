import { test, expect, describe } from "bun:test";
import { setupCliTest, assertOutputMatches } from "../../../util/cliTestUtils";

describe("CLI Run Script (stdout vs. stderr)", () => {
  test("Running with failures", async () => {
    const { run } = setupCliTest({
      testProject: "runScriptWithFailures",
    });

    const result = await run("run-script", "test-exit");
    expect(result.exitCode).toBe(1);
    assertOutputMatches(
      result.stdoutAndErr.sanitizedCompactLines,
      `[fail1:test-exit] fail1
[fail2:test-exit] fail2
[success1:test-exit] success1
[success2:test-exit] success2
❌ fail1: test-exit (exited with code 1)
❌ fail2: test-exit (exited with code 2)
✅ success1: test-exit
✅ success2: test-exit
2 of 4 scripts failed`,
    );
    assertOutputMatches(
      result.stderr.sanitizedCompactLines,
      `[fail1:test-exit] fail1
[fail2:test-exit] fail2`,
    );
    assertOutputMatches(
      result.stdout.sanitizedCompactLines,
      `[success1:test-exit] success1
[success2:test-exit] success2
❌ fail1: test-exit (exited with code 1)
❌ fail2: test-exit (exited with code 2)
✅ success1: test-exit
✅ success2: test-exit
2 of 4 scripts failed`,
    );
  });

  test("Running with mixed output per script", async () => {
    const { run } = setupCliTest({
      testProject: "runScriptWithMixedOutput",
    });

    const result = await run("run-script", "test-exit");
    expect(result.exitCode).toBe(1);
    assertOutputMatches(
      result.stdoutAndErr.sanitizedCompactLines,
      `[fail1:test-exit] fail1 stdout 1
[fail1:test-exit] fail1 stderr 1
[fail1:test-exit] fail1 stdout 2
[fail2:test-exit] fail2 stderr 1
[fail2:test-exit] fail2 stdout 1
[fail2:test-exit] fail2 stderr 2
[success1:test-exit] success1 stdout 1
[success1:test-exit] success1 stderr 1
[success1:test-exit] success1 stdout 2
[success1:test-exit] success1 stderr 2
[success2:test-exit] success2 stderr 1
[success2:test-exit] success2 stdout 1
[success2:test-exit] success2 stderr 2
[success2:test-exit] success2 stdout 2
❌ fail1: test-exit (exited with code 1)
❌ fail2: test-exit (exited with code 1)
✅ success1: test-exit
✅ success2: test-exit
2 of 4 scripts failed`,
    );
  });
});
