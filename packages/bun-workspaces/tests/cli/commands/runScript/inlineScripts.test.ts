import { test, expect, describe } from "bun:test";
import { setupCliTest, assertOutputMatches } from "../../../util/cliTestUtils";

describe("CLI Run Script (inline scripts)", () => {
  test("Using --inline", async () => {
    const { run } = setupCliTest({
      testProject: "runScriptWithEchoArgs",
    });

    const resultSimple = await run(
      "run-script",
      "echo this is my inline script for <workspaceName>",
      "--inline",
    );
    expect(resultSimple.exitCode).toBe(0);
    assertOutputMatches(
      resultSimple.stdoutAndErr.sanitizedCompactLines,
      `[application-1a:(inline)] this is my inline script for application-1a
[application-1b:(inline)] this is my inline script for application-1b
[library-1a:(inline)] this is my inline script for library-1a
[library-1b:(inline)] this is my inline script for library-1b
✅ application-1a: (inline)
✅ application-1b: (inline)
✅ library-1a: (inline)
✅ library-1b: (inline)
4 scripts ran successfully`,
    );

    const resultSimpleShort = await run(
      "run-script",
      "echo this is my inline script for <workspaceName>",
      "-i",
    );
    expect(resultSimpleShort.exitCode).toBe(0);
    assertOutputMatches(
      resultSimpleShort.stdoutAndErr.sanitizedCompactLines,
      `[application-1a:(inline)] this is my inline script for application-1a
[application-1b:(inline)] this is my inline script for application-1b
[library-1a:(inline)] this is my inline script for library-1a
[library-1b:(inline)] this is my inline script for library-1b
✅ application-1a: (inline)
✅ application-1b: (inline)
✅ library-1a: (inline)
✅ library-1b: (inline)
4 scripts ran successfully`,
    );

    const resultWithArgs = await run(
      "run-script",
      "echo this is my inline script for <workspaceName>",
      "--inline",
      "--args=test-args-<workspaceName>",
    );
    expect(resultWithArgs.exitCode).toBe(0);
    assertOutputMatches(
      resultWithArgs.stdoutAndErr.sanitizedCompactLines,
      `[application-1a:(inline)] this is my inline script for application-1a test-args-application-1a
[application-1b:(inline)] this is my inline script for application-1b test-args-application-1b
[library-1a:(inline)] this is my inline script for library-1a test-args-library-1a
[library-1b:(inline)] this is my inline script for library-1b test-args-library-1b
✅ application-1a: (inline)
✅ application-1b: (inline)
✅ library-1a: (inline)
✅ library-1b: (inline)
4 scripts ran successfully`,
    );

    const resultWithArgsNoPrefix = await run(
      "run-script",
      "echo this is my inline script for <workspaceName>",
      "--inline",
      "--args=test-args-<workspaceName>",
      "--no-prefix",
    );
    expect(resultWithArgsNoPrefix.exitCode).toBe(0);
    assertOutputMatches(
      resultWithArgsNoPrefix.stdoutAndErr.sanitizedCompactLines,
      `this is my inline script for application-1a test-args-application-1a
this is my inline script for application-1b test-args-application-1b
this is my inline script for library-1a test-args-library-1a
this is my inline script for library-1b test-args-library-1b
✅ application-1a: (inline)
✅ application-1b: (inline)
✅ library-1a: (inline)
✅ library-1b: (inline)
4 scripts ran successfully`,
    );
  });
});

describe("CLI Run Script (named inline scripts)", () => {
  test("Named inline script", async () => {
    const { run } = setupCliTest({
      testProject: "runScriptWithEchoArgs",
    });
    const result = await run(
      "run-script",
      "echo this is my inline script for <workspaceName>",
      "--inline",
      "--inline-name=test-echo-inline",
    );
    expect(result.exitCode).toBe(0);
    assertOutputMatches(
      result.stdoutAndErr.sanitizedCompactLines,
      `[application-1a:test-echo-inline] this is my inline script for application-1a
[application-1b:test-echo-inline] this is my inline script for application-1b
[library-1a:test-echo-inline] this is my inline script for library-1a
[library-1b:test-echo-inline] this is my inline script for library-1b
✅ application-1a: test-echo-inline
✅ application-1b: test-echo-inline
✅ library-1a: test-echo-inline
✅ library-1b: test-echo-inline
4 scripts ran successfully`,
    );

    const resultShort = await run(
      "run-script",
      "echo this is my inline script for <workspaceName>",
      "-i",
      "-I test-echo-inline",
    );
    expect(resultShort.exitCode).toBe(0);
    assertOutputMatches(
      resultShort.stdoutAndErr.sanitizedCompactLines,
      `[application-1a:test-echo-inline] this is my inline script for application-1a
[application-1b:test-echo-inline] this is my inline script for application-1b
[library-1a:test-echo-inline] this is my inline script for library-1a
[library-1b:test-echo-inline] this is my inline script for library-1b
✅ application-1a: test-echo-inline
✅ application-1b: test-echo-inline
✅ library-1a: test-echo-inline
✅ library-1b: test-echo-inline
4 scripts ran successfully`,
    );
  });
});
