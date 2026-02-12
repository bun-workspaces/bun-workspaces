import { test, expect, describe } from "bun:test";
import { setupCliTest, assertOutputMatches } from "../../../util/cliTestUtils";

describe("CLI Run Script (args)", () => {
  test("Using --args", async () => {
    const { run } = setupCliTest({
      testProject: "runScriptWithEchoArgs",
    });
    const result = await run("run-script", "test-echo", "--args=test-args");
    expect(result.exitCode).toBe(0);
    assertOutputMatches(
      result.stdoutAndErr.sanitizedCompactLines,
      `[application-1a:test-echo] passed args: test-args
[application-1b:test-echo] passed args: test-args
[library-1a:test-echo] passed args: test-args
[library-1b:test-echo] passed args: test-args
✅ application-1a: test-echo
✅ application-1b: test-echo
✅ library-1a: test-echo
✅ library-1b: test-echo
4 scripts ran successfully`,
    );

    const resultShort = await run("run-script", "test-echo", "-a test-args");
    expect(resultShort.exitCode).toBe(0);
    assertOutputMatches(
      resultShort.stdoutAndErr.sanitizedCompactLines,
      `[application-1a:test-echo] passed args: test-args
[application-1b:test-echo] passed args: test-args
[library-1a:test-echo] passed args: test-args
[library-1b:test-echo] passed args: test-args
✅ application-1a: test-echo
✅ application-1b: test-echo
✅ library-1a: test-echo
✅ library-1b: test-echo
4 scripts ran successfully`,
    );

    const result2 = await run(
      "run-script",
      "test-echo",
      '--args="hello there <workspaceName>"',
    );
    expect(result2.exitCode).toBe(0);
    assertOutputMatches(
      result2.stdoutAndErr.sanitizedCompactLines,
      `[application-1a:test-echo] passed args: hello there application-1a
[application-1b:test-echo] passed args: hello there application-1b
[library-1a:test-echo] passed args: hello there library-1a
[library-1b:test-echo] passed args: hello there library-1b
✅ application-1a: test-echo
✅ application-1b: test-echo
✅ library-1a: test-echo
✅ library-1b: test-echo
4 scripts ran successfully`,
    );

    const result3 = await run(
      "run-script",
      "test-echo",
      "--args=<workspaceName> and <workspaceName> and <workspaceName>",
    );
    expect(result3.exitCode).toBe(0);
    assertOutputMatches(
      result3.stdoutAndErr.sanitizedCompactLines,
      `[application-1a:test-echo] passed args: application-1a and application-1a and application-1a
[application-1b:test-echo] passed args: application-1b and application-1b and application-1b
[library-1a:test-echo] passed args: library-1a and library-1a and library-1a
[library-1b:test-echo] passed args: library-1b and library-1b and library-1b
✅ application-1a: test-echo
✅ application-1b: test-echo
✅ library-1a: test-echo
✅ library-1b: test-echo
4 scripts ran successfully`,
    );

    const result4 = await run(
      "run-script",
      "test-echo",
      "deprecated_appA",
      "deprecated_libB",
      "--args=for workspace <workspaceName>",
    );
    expect(result4.exitCode).toBe(0);
    assertOutputMatches(
      result4.stdoutAndErr.sanitizedCompactLines,
      `[application-1a:test-echo] passed args: for workspace application-1a
[library-1b:test-echo] passed args: for workspace library-1b
✅ application-1a: test-echo
✅ library-1b: test-echo
2 scripts ran successfully`,
    );

    const result5 = await run(
      "run-script",
      "test-echo",
      "--no-prefix",
      "--args=test-args",
    );
    expect(result5.exitCode).toBe(0);
    assertOutputMatches(
      result5.stdoutAndErr.sanitizedCompactLines,
      `passed args: test-args
passed args: test-args
passed args: test-args
passed args: test-args
✅ application-1a: test-echo
✅ application-1b: test-echo
✅ library-1a: test-echo
✅ library-1b: test-echo
4 scripts ran successfully`,
    );

    const result6 = await run(
      "run-script",
      "test-echo",
      "--no-prefix",
      "--args=<workspaceName>",
    );
    expect(result6.exitCode).toBe(0);
    assertOutputMatches(
      result6.stdoutAndErr.sanitizedCompactLines,
      `passed args: application-1a
passed args: application-1b
passed args: library-1a
passed args: library-1b
✅ application-1a: test-echo
✅ application-1b: test-echo
✅ library-1a: test-echo
✅ library-1b: test-echo
4 scripts ran successfully`,
    );

    const terminatorResult = await run(
      "run-script",
      "test-echo",
      "--",
      "test-args",
      "--another-arg",
    );
    expect(terminatorResult.exitCode).toBe(0);
    assertOutputMatches(
      terminatorResult.stdoutAndErr.sanitizedCompactLines,
      `[application-1a:test-echo] passed args: test-args --another-arg
[application-1b:test-echo] passed args: test-args --another-arg
[library-1a:test-echo] passed args: test-args --another-arg
[library-1b:test-echo] passed args: test-args --another-arg
✅ application-1a: test-echo
✅ application-1b: test-echo
✅ library-1a: test-echo
✅ library-1b: test-echo
4 scripts ran successfully`,
    );

    const terminatorAndOptionResult = await run(
      "run-script",
      "test-echo",
      "--args=my-arg",
      "--",
      "test-args",
      "--another-arg",
      "--args=test-args",
    );
    expect(terminatorAndOptionResult.exitCode).toBe(1);
    assertOutputMatches(
      terminatorAndOptionResult.stderr.sanitizedCompactLines,
      `CLI syntax error: Cannot use both --args and inline script args after --`,
    );
  });
});
