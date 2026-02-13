import { test, expect, describe } from "bun:test";
import { setupCliTest, assertOutputMatches } from "../../../util/cliTestUtils";

describe("CLI Run Script (inline scripts)", () => {
  test("--inline runs inline script with <workspaceName> interpolation", async () => {
    const { run } = setupCliTest({
      testProject: "runScriptWithEchoArgs",
    });
    const result = await run(
      "run-script",
      "echo this is my inline script for <workspaceName>",
      "--inline",
    );
    expect(result.exitCode).toBe(0);
    assertOutputMatches(
      result.stdoutAndErr.sanitizedCompactLines,
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
  });

  test("-i runs inline script with <workspaceName> interpolation", async () => {
    const { run } = setupCliTest({
      testProject: "runScriptWithEchoArgs",
    });
    const result = await run(
      "run-script",
      "echo this is my inline script for <workspaceName>",
      "-i",
    );
    expect(result.exitCode).toBe(0);
    assertOutputMatches(
      result.stdoutAndErr.sanitizedCompactLines,
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
  });

  test("--inline with --args interpolates per workspace", async () => {
    const { run } = setupCliTest({
      testProject: "runScriptWithEchoArgs",
    });
    const result = await run(
      "run-script",
      "echo this is my inline script for <workspaceName>",
      "--inline",
      "--args=test-args-<workspaceName>",
    );
    expect(result.exitCode).toBe(0);
    assertOutputMatches(
      result.stdoutAndErr.sanitizedCompactLines,
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
  });

  test("--inline with --args and --no-prefix", async () => {
    const { run } = setupCliTest({
      testProject: "runScriptWithEchoArgs",
    });
    const result = await run(
      "run-script",
      "echo this is my inline script for <workspaceName>",
      "--inline",
      "--args=test-args-<workspaceName>",
      "--no-prefix",
    );
    expect(result.exitCode).toBe(0);
    assertOutputMatches(
      result.stdoutAndErr.sanitizedCompactLines,
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
  test("--inline-name sets script name in output", async () => {
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
  });

  test("-I sets script name in output", async () => {
    const { run } = setupCliTest({
      testProject: "runScriptWithEchoArgs",
    });
    const result = await run(
      "run-script",
      "echo this is my inline script for <workspaceName>",
      "-i",
      "-I test-echo-inline",
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
  });
});
