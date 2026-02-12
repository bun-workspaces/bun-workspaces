import { test, expect, describe } from "bun:test";
import { setupCliTest, assertOutputMatches } from "../../../util/cliTestUtils";

const ALL_FOUR_SUCCESS = `✅ application-1a: test-echo
✅ application-1b: test-echo
✅ library-1a: test-echo
✅ library-1b: test-echo
4 scripts ran successfully`;

const ECHO_LITERAL_PREFIX = `[application-1a:test-echo] passed args: test-args
[application-1b:test-echo] passed args: test-args
[library-1a:test-echo] passed args: test-args
[library-1b:test-echo] passed args: test-args
`;

const ECHO_LITERAL_NO_PREFIX = `passed args: test-args
passed args: test-args
passed args: test-args
passed args: test-args
`;

describe("CLI Run Script (args)", () => {
  describe("--args / -a", () => {
    test("--args passes literal to script", async () => {
      const { run } = setupCliTest({
        testProject: "runScriptWithEchoArgs",
      });
      const result = await run("run-script", "test-echo", "--args=test-args");
      expect(result.exitCode).toBe(0);
      assertOutputMatches(
        result.stdoutAndErr.sanitizedCompactLines,
        `${ECHO_LITERAL_PREFIX}${ALL_FOUR_SUCCESS}`,
      );
    });

    test("-a passes literal to script", async () => {
      const { run } = setupCliTest({
        testProject: "runScriptWithEchoArgs",
      });
      const result = await run("run-script", "test-echo", "-a test-args");
      expect(result.exitCode).toBe(0);
      assertOutputMatches(
        result.stdoutAndErr.sanitizedCompactLines,
        `${ECHO_LITERAL_PREFIX}${ALL_FOUR_SUCCESS}`,
      );
    });

    test("--args interpolates <workspaceName> in quoted value", async () => {
      const { run } = setupCliTest({
        testProject: "runScriptWithEchoArgs",
      });
      const result = await run(
        "run-script",
        "test-echo",
        '--args="hello there <workspaceName>"',
      );
      expect(result.exitCode).toBe(0);
      assertOutputMatches(
        result.stdoutAndErr.sanitizedCompactLines,
        `[application-1a:test-echo] passed args: hello there application-1a
[application-1b:test-echo] passed args: hello there application-1b
[library-1a:test-echo] passed args: hello there library-1a
[library-1b:test-echo] passed args: hello there library-1b
${ALL_FOUR_SUCCESS}`,
      );
    });

    test("--args interpolates multiple <workspaceName> placeholders", async () => {
      const { run } = setupCliTest({
        testProject: "runScriptWithEchoArgs",
      });
      const result = await run(
        "run-script",
        "test-echo",
        "--args=<workspaceName> and <workspaceName> and <workspaceName>",
      );
      expect(result.exitCode).toBe(0);
      assertOutputMatches(
        result.stdoutAndErr.sanitizedCompactLines,
        `[application-1a:test-echo] passed args: application-1a and application-1a and application-1a
[application-1b:test-echo] passed args: application-1b and application-1b and application-1b
[library-1a:test-echo] passed args: library-1a and library-1a and library-1a
[library-1b:test-echo] passed args: library-1b and library-1b and library-1b
${ALL_FOUR_SUCCESS}`,
      );
    });

    test("--args with workspace patterns interpolates per workspace", async () => {
      const { run } = setupCliTest({
        testProject: "runScriptWithEchoArgs",
      });
      const result = await run(
        "run-script",
        "test-echo",
        "deprecated_appA",
        "deprecated_libB",
        "--args=for workspace <workspaceName>",
      );
      expect(result.exitCode).toBe(0);
      assertOutputMatches(
        result.stdoutAndErr.sanitizedCompactLines,
        `[application-1a:test-echo] passed args: for workspace application-1a
[library-1b:test-echo] passed args: for workspace library-1b
✅ application-1a: test-echo
✅ library-1b: test-echo
2 scripts ran successfully`,
      );
    });
  });

  describe("--no-prefix with --args", () => {
    test("--args=literal with --no-prefix", async () => {
      const { run } = setupCliTest({
        testProject: "runScriptWithEchoArgs",
      });
      const result = await run(
        "run-script",
        "test-echo",
        "--no-prefix",
        "--args=test-args",
      );
      expect(result.exitCode).toBe(0);
      assertOutputMatches(
        result.stdoutAndErr.sanitizedCompactLines,
        `${ECHO_LITERAL_NO_PREFIX}${ALL_FOUR_SUCCESS}`,
      );
    });

    test("--args=<workspaceName> with --no-prefix", async () => {
      const { run } = setupCliTest({
        testProject: "runScriptWithEchoArgs",
      });
      const result = await run(
        "run-script",
        "test-echo",
        "--no-prefix",
        "--args=<workspaceName>",
      );
      expect(result.exitCode).toBe(0);
      assertOutputMatches(
        result.stdoutAndErr.sanitizedCompactLines,
        `passed args: application-1a
passed args: application-1b
passed args: library-1a
passed args: library-1b
${ALL_FOUR_SUCCESS}`,
      );
    });
  });

  describe("argument terminator (--)", () => {
    test("args after -- are passed to script", async () => {
      const { run } = setupCliTest({
        testProject: "runScriptWithEchoArgs",
      });
      const result = await run(
        "run-script",
        "test-echo",
        "--",
        "test-args",
        "--another-arg",
      );
      expect(result.exitCode).toBe(0);
      assertOutputMatches(
        result.stdoutAndErr.sanitizedCompactLines,
        `[application-1a:test-echo] passed args: test-args --another-arg
[application-1b:test-echo] passed args: test-args --another-arg
[library-1a:test-echo] passed args: test-args --another-arg
[library-1b:test-echo] passed args: test-args --another-arg
${ALL_FOUR_SUCCESS}`,
      );
    });

    test("errors when both --args and args after -- used", async () => {
      const { run } = setupCliTest({
        testProject: "runScriptWithEchoArgs",
      });
      const result = await run(
        "run-script",
        "test-echo",
        "--args=my-arg",
        "--",
        "test-args",
        "--another-arg",
        "--args=test-args",
      );
      expect(result.exitCode).toBe(1);
      assertOutputMatches(
        result.stderr.sanitizedCompactLines,
        "CLI syntax error: Cannot use both --args and inline script args after --",
      );
    });
  });
});
