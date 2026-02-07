import fs from "fs";
import { availableParallelism } from "os";
import path from "path";
import { test, expect, describe, beforeAll } from "bun:test";
import { getUserEnvVar } from "../src/config/userEnvVars";
import { createRawPattern } from "../src/internal/core";
import { getProjectRoot, type TestProjectName } from "./testProjects";
import { setupCliTest, assertOutputMatches } from "./util/cliTestUtils";
import { withWindowsPath } from "./util/windows";

const TEST_OUTPUT_DIR = path.resolve(__dirname, "test-output");

describe("CLI Run Script", () => {
  beforeAll(() => {
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.rmSync(TEST_OUTPUT_DIR, { recursive: true });
    }
  });

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

  test(
    "Running in series vs. parallel",
    async () => {
      const { run } = setupCliTest({
        testProject: "runScriptWithDelays",
      });

      const resultSeries = await run("run-script", "test-delay");
      expect(resultSeries.exitCode).toBe(0);
      assertOutputMatches(
        resultSeries.stdout.sanitizedCompactLines,
        `[fifth:test-delay] fifth
[first:test-delay] first
[fourth:test-delay] fourth
[second:test-delay] second
[third:test-delay] third
✅ fifth: test-delay
✅ first: test-delay
✅ fourth: test-delay
✅ second: test-delay
✅ third: test-delay
5 scripts ran successfully`,
      );

      const resultParallel = await run(
        "run-script",
        "test-delay",
        "--parallel",
      );
      expect(resultParallel.exitCode).toBe(0);
      assertOutputMatches(
        resultParallel.stdout.sanitizedCompactLines,
        `[first:test-delay] first
[second:test-delay] second
[third:test-delay] third
[fourth:test-delay] fourth
[fifth:test-delay] fifth
✅ fifth: test-delay
✅ first: test-delay
✅ fourth: test-delay
✅ second: test-delay
✅ third: test-delay
5 scripts ran successfully`,
      );

      const resultParallelShort = await run("run-script", "test-delay", "-P");
      expect(resultParallelShort.exitCode).toBe(0);
      assertOutputMatches(
        resultParallelShort.stdout.sanitizedCompactLines,
        `[first:test-delay] first
[second:test-delay] second
[third:test-delay] third
[fourth:test-delay] fourth
[fifth:test-delay] fifth
✅ fifth: test-delay
✅ first: test-delay
✅ fourth: test-delay
✅ second: test-delay
✅ third: test-delay
5 scripts ran successfully`,
      );
    },
    { repeats: 2 },
  );

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

  test("JSON output - errors with output path", async () => {
    const { run } = setupCliTest({
      testProject: "simple1",
    });

    fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });

    const result = await run(
      "run-script",
      "all-workspaces",
      `--json-outfile=${TEST_OUTPUT_DIR}`,
    );
    expect(result.exitCode).toBe(1);
    assertOutputMatches(
      result.stderr.sanitizedCompactLines,
      `Given JSON output file path "${TEST_OUTPUT_DIR}" is an existing directory`,
    );

    fs.writeFileSync(TEST_OUTPUT_DIR + "/test-file.txt", "test file");
    const result2 = await run(
      "run-script",
      "all-workspaces",
      "--json-outfile",
      TEST_OUTPUT_DIR + "/test-file.txt/test-file.json",
    );
    expect(result2.exitCode).toBe(1);
    assertOutputMatches(
      result2.stderr.sanitizedCompactLines,
      `Given JSON output file directory "${withWindowsPath(`${TEST_OUTPUT_DIR}/test-file.txt`)}" is an existing file`,
    );

    const result3 = await run(
      "run-script",
      "all-workspaces",
      "--json-outfile",
      TEST_OUTPUT_DIR + "/test-file.txt/something/else.json",
    );
    expect(result3.exitCode).toBe(1);
    assertOutputMatches(
      result3.stderr.sanitizedCompactLines,
      new RegExp(
        createRawPattern(
          `Failed to create JSON output file directory "${withWindowsPath(`${TEST_OUTPUT_DIR}/test-file.txt/something`)}":`,
        ),
      ),
    );
  });

  const runAndGetJsonOutput = async (
    testProject: TestProjectName,
    outputPath: string,
    ...args: string[]
  ) => {
    const { run } = setupCliTest({ testProject });
    const fullOutputPath = path.resolve(TEST_OUTPUT_DIR, outputPath);
    const result = await run(
      "run-script",
      ...args,
      "--json-outfile",
      fullOutputPath,
    );
    return {
      result,
      json: JSON.parse(fs.readFileSync(fullOutputPath, "utf8")),
    };
  };

  test("Runtime metadata", async () => {
    const projectRoot = getProjectRoot("runScriptWithRuntimeMetadataDebug");

    const { run } = setupCliTest({
      testProject: "runScriptWithRuntimeMetadataDebug",
    });

    const plainResult = await run("run-script", "test-echo");
    expect(plainResult.exitCode).toBe(0);
    assertOutputMatches(
      plainResult.stdoutAndErr.sanitizedCompactLines,
      `[application-a:test-echo] ${projectRoot} test-root application-a ${withWindowsPath(projectRoot + "/applications/application-a")} ${withWindowsPath("applications/application-a")} test-echo
[application-b:test-echo] ${projectRoot} test-root application-b ${withWindowsPath(projectRoot + "/applications/application-b")} ${withWindowsPath("applications/application-b")} test-echo
✅ application-a: test-echo
✅ application-b: test-echo
2 scripts ran successfully`,
    );

    const argsResult = await run(
      "run-script",
      "test-echo",
      "--args=--arg1=<projectPath> --arg2=<projectName> --arg3=<workspaceName> --arg4=<workspacePath> --arg5=<workspaceRelativePath> --arg6=<scriptName>",
    );
    assertOutputMatches(
      argsResult.stdoutAndErr.sanitizedCompactLines,
      `[application-a:test-echo] ${projectRoot} test-root application-a ${withWindowsPath(projectRoot + "/applications/application-a")} ${withWindowsPath("applications/application-a")} test-echo --arg1=${projectRoot} --arg2=test-root --arg3=application-a --arg4=${withWindowsPath(projectRoot + "/applications/application-a")} --arg5=${withWindowsPath("applications/application-a")} --arg6=test-echo
[application-b:test-echo] ${projectRoot} test-root application-b ${withWindowsPath(projectRoot + "/applications/application-b")} ${withWindowsPath("applications/application-b")} test-echo --arg1=${projectRoot} --arg2=test-root --arg3=application-b --arg4=${withWindowsPath(projectRoot + "/applications/application-b")} --arg5=${withWindowsPath("applications/application-b")} --arg6=test-echo
✅ application-a: test-echo
✅ application-b: test-echo
2 scripts ran successfully`,
    );

    const inlineResult = await run(
      "run-script",
      "echo <projectPath> <projectName> <workspaceName> <workspacePath> <workspaceRelativePath> <scriptName>",
      "--inline",
    );
    expect(inlineResult.exitCode).toBe(0);
    assertOutputMatches(
      inlineResult.stdoutAndErr.sanitizedCompactLines,
      `[application-a:(inline)] ${projectRoot} test-root application-a ${withWindowsPath(projectRoot + "/applications/application-a")} ${withWindowsPath("applications/application-a")}
[application-b:(inline)] ${projectRoot} test-root application-b ${withWindowsPath(projectRoot + "/applications/application-b")} ${withWindowsPath("applications/application-b")}
✅ application-a: (inline)
✅ application-b: (inline)
2 scripts ran successfully`,
    );
  });

  test("Run script sequence config", async () => {
    const { run: runDelay } = setupCliTest({
      testProject: "runScriptWithDelaysAndSequenceConfig",
    });
    const seriesDelayResult = await runDelay("run-script", "test-delay");
    expect(seriesDelayResult.exitCode).toBe(0);
    assertOutputMatches(
      seriesDelayResult.stdoutAndErr.sanitizedCompactLines,
      `[first:test-delay] first
[second:test-delay] second
[third:test-delay] third
[fourth:test-delay] fourth
[fifth:test-delay] fifth
✅ first: test-delay
✅ second: test-delay
✅ third: test-delay
✅ fourth: test-delay
✅ fifth: test-delay
5 scripts ran successfully`,
    );

    const parallelDelayResult = await runDelay(
      "run-script",
      "test-delay",
      "--parallel",
    );
    expect(parallelDelayResult.exitCode).toBe(0);
    assertOutputMatches(
      parallelDelayResult.stdoutAndErr.sanitizedCompactLines,
      `[first:test-delay] first
[second:test-delay] second
[third:test-delay] third
[fourth:test-delay] fourth
[fifth:test-delay] fifth
✅ first: test-delay
✅ second: test-delay
✅ third: test-delay
✅ fourth: test-delay
✅ fifth: test-delay
5 scripts ran successfully`,
    );

    const { run: runSequence } = setupCliTest({
      testProject: "runScriptWithSequenceConfig",
    });
    const seriesSequenceResult = await runSequence("run-script", "test-echo");
    expect(seriesSequenceResult.exitCode).toBe(0);
    assertOutputMatches(
      seriesSequenceResult.stdoutAndErr.sanitizedCompactLines,
      `[first:test-echo] first
[second:test-echo] second
[third:test-echo] third
[fourth:test-echo] fourth
[fifth:test-echo] fifth
✅ first: test-echo
✅ second: test-echo
✅ third: test-echo
✅ fourth: test-echo
✅ fifth: test-echo
5 scripts ran successfully`,
    );

    const parallelSequenceResult = await runSequence(
      "run-script",
      "test-echo",
      "--parallel",
    );
    expect(parallelSequenceResult.exitCode).toBe(0);
    assertOutputMatches(
      parallelSequenceResult.stdoutAndErr.sanitizedCompactLines,
      new RegExp(`
✅ first: test-echo
✅ second: test-echo
✅ third: test-echo
✅ fourth: test-echo
✅ fifth: test-echo
5 scripts ran successfully`),
    );

    const { run: runSequencePartial } = setupCliTest({
      testProject: "runScriptWithSequenceConfigPartial",
    });
    const seriesSequencePartialResult = await runSequencePartial(
      "run-script",
      "test-echo",
    );
    expect(seriesSequencePartialResult.exitCode).toBe(0);
    assertOutputMatches(
      seriesSequencePartialResult.stdoutAndErr.sanitizedCompactLines,
      `[e:test-echo] e
[d:test-echo] d
[b:test-echo] b
[a:test-echo] a
[c:test-echo] c
✅ e: test-echo
✅ d: test-echo
✅ b: test-echo
✅ a: test-echo
✅ c: test-echo
5 scripts ran successfully`,
    );

    const parallelSequencePartialResult = await runSequencePartial(
      "run-script",
      "test-echo",
      "--parallel",
    );
    expect(parallelSequencePartialResult.exitCode).toBe(0);
    assertOutputMatches(
      parallelSequencePartialResult.stdoutAndErr.sanitizedCompactLines,
      new RegExp(`✅ e: test-echo
✅ d: test-echo
✅ b: test-echo
✅ a: test-echo
✅ c: test-echo
5 scripts ran successfully`),
    );
  });

  test.each([1, 2, 3, "default", "auto", "unbounded", "100%", "50%"])(
    "runScriptAcrossWorkspaces: parallel with max (%p)",
    async (max) => {
      const { run } = setupCliTest({
        testProject: "runScriptWithDebugParallelMax",
      });
      const { stdout } = await run(
        "run-script",
        "test-debug",
        "--parallel",
        max.toString(),
      );

      const createOutput = (max: number | string) => `[a:test-debug] ${max}`;

      if (typeof max === "number") {
        expect(stdout.sanitizedCompactLines).toStartWith(createOutput(max));
      } else if (max === "default") {
        expect(stdout.sanitizedCompactLines).toStartWith(
          createOutput(
            getUserEnvVar("parallelMaxDefault")?.trim() ??
              availableParallelism().toString(),
          ),
        );
      } else if (max === "auto") {
        expect(stdout.sanitizedCompactLines).toStartWith(
          createOutput(availableParallelism().toString()),
        );
      } else if (max === "unbounded") {
        expect(stdout.sanitizedCompactLines).toStartWith(
          createOutput("Infinity"),
        );
      } else if (max.endsWith("%")) {
        expect(stdout.sanitizedCompactLines).toStartWith(
          createOutput(
            Math.max(
              1,
              Math.floor(
                (availableParallelism() * parseFloat(max.slice(0, -1))) / 100,
              ),
            ).toString(),
          ),
        );
      }
    },
  );

  test("JSON output file - all success", async () => {
    const { json: jsonOutput1 } = await runAndGetJsonOutput(
      "simple1",
      "test-simple1.json",
      "all-workspaces",
      '--args="test args"',
    );
    expect(jsonOutput1).toEqual({
      totalCount: 4,
      successCount: 4,
      failureCount: 0,
      allSuccess: true,
      startTimeISO: expect.any(String),
      endTimeISO: expect.any(String),
      durationMs: expect.any(Number),
      scriptResults: [
        {
          metadata: {
            workspace: {
              name: "application-1a",
              isRoot: false,
              matchPattern: "applications/*",
              path: withWindowsPath("applications/applicationA"),
              aliases: ["deprecated_appA"],
              scripts: ["a-workspaces", "all-workspaces", "application-a"],
              dependencies: [],
              dependents: [],
            },
          },
          success: true,
          signal: null,
          exitCode: 0,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
        },
        {
          metadata: {
            workspace: {
              name: "application-1b",
              isRoot: false,
              matchPattern: "applications/*",
              path: withWindowsPath("applications/applicationB"),
              aliases: ["deprecated_appB"],
              scripts: ["all-workspaces", "application-b", "b-workspaces"],
              dependencies: [],
              dependents: [],
            },
          },
          success: true,
          signal: null,
          exitCode: 0,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
        },
        {
          metadata: {
            workspace: {
              name: "library-1a",
              isRoot: false,
              matchPattern: "libraries/*",
              path: withWindowsPath("libraries/libraryA"),
              aliases: ["deprecated_libA"],
              scripts: ["a-workspaces", "all-workspaces", "library-a"],
              dependencies: [],
              dependents: [],
            },
          },
          success: true,
          signal: null,
          exitCode: 0,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
        },
        {
          metadata: {
            workspace: {
              name: "library-1b",
              isRoot: false,
              matchPattern: "libraries/*",
              path: withWindowsPath("libraries/libraryB"),
              aliases: ["deprecated_libB"],
              scripts: ["all-workspaces", "b-workspaces", "library-b"],
              dependencies: [],
              dependents: [],
            },
          },
          success: true,
          signal: null,
          exitCode: 0,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
        },
      ],
    });
    for (const { startTimeISO, endTimeISO, durationMs } of [
      jsonOutput1,
      ...jsonOutput1.scriptResults,
    ]) {
      expect(startTimeISO).toStartWith(new Date().toISOString().slice(0, 10));
      expect(endTimeISO).toStartWith(new Date().toISOString().slice(0, 10));
      expect(durationMs).toBe(
        new Date(endTimeISO).getTime() - new Date(startTimeISO).getTime(),
      );
    }

    const { json: jsonOutput2 } = await runAndGetJsonOutput(
      "simple1",
      "test-simple2.json",
      "a-workspaces",
      "--args=my-args",
    );
    expect(jsonOutput2).toEqual({
      totalCount: 2,
      successCount: 2,
      failureCount: 0,
      allSuccess: true,
      startTimeISO: expect.any(String),
      endTimeISO: expect.any(String),
      durationMs: expect.any(Number),
      scriptResults: [
        {
          metadata: {
            workspace: {
              name: "application-1a",
              isRoot: false,
              matchPattern: "applications/*",
              path: withWindowsPath("applications/applicationA"),
              aliases: ["deprecated_appA"],
              scripts: ["a-workspaces", "all-workspaces", "application-a"],
              dependencies: [],
              dependents: [],
            },
          },
          success: true,
          signal: null,
          exitCode: 0,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
        },
        {
          metadata: {
            workspace: {
              name: "library-1a",
              isRoot: false,
              matchPattern: "libraries/*",
              path: withWindowsPath("libraries/libraryA"),
              aliases: ["deprecated_libA"],
              scripts: ["a-workspaces", "all-workspaces", "library-a"],
              dependencies: [],
              dependents: [],
            },
          },
          success: true,
          signal: null,
          exitCode: 0,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
        },
      ],
    });

    for (const { startTimeISO, endTimeISO, durationMs } of [
      jsonOutput2,
      ...jsonOutput2.scriptResults,
    ]) {
      expect(startTimeISO).toStartWith(new Date().toISOString().slice(0, 10));
      expect(endTimeISO).toStartWith(new Date().toISOString().slice(0, 10));
      expect(durationMs).toBe(
        new Date(endTimeISO).getTime() - new Date(startTimeISO).getTime(),
      );
    }

    const { json: jsonOutput3 } = await runAndGetJsonOutput(
      "simple1",
      "test-simple3.json",
      "b-workspaces",
      "library*",
      "--parallel",
    );
    expect(jsonOutput3).toEqual({
      totalCount: 1,
      successCount: 1,
      failureCount: 0,
      allSuccess: true,
      startTimeISO: expect.any(String),
      endTimeISO: expect.any(String),
      durationMs: expect.any(Number),
      scriptResults: [
        {
          metadata: {
            workspace: {
              name: "library-1b",
              isRoot: false,
              matchPattern: "libraries/*",
              path: withWindowsPath("libraries/libraryB"),
              scripts: ["all-workspaces", "b-workspaces", "library-b"],
              aliases: ["deprecated_libB"],
              dependencies: [],
              dependents: [],
            },
          },
          signal: null,
          success: true,
          exitCode: 0,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
        },
      ],
    });

    for (const { startTimeISO, endTimeISO, durationMs } of [
      jsonOutput3,
      ...jsonOutput3.scriptResults,
    ]) {
      expect(startTimeISO).toStartWith(new Date().toISOString().slice(0, 10));
      expect(endTimeISO).toStartWith(new Date().toISOString().slice(0, 10));
      expect(durationMs).toBe(
        new Date(endTimeISO).getTime() - new Date(startTimeISO).getTime(),
      );
    }
  });

  test("JSON output file - mixed results", async () => {
    const { json } = await runAndGetJsonOutput(
      "runScriptWithFailures",
      "test-mixed-results.json",
      "test-exit",
      "--parallel",
    );

    expect(json).toEqual({
      totalCount: 4,
      successCount: 2,
      failureCount: 2,
      allSuccess: false,
      startTimeISO: expect.any(String),
      endTimeISO: expect.any(String),
      durationMs: expect.any(Number),
      scriptResults: [
        {
          metadata: {
            workspace: {
              name: "fail1",
              isRoot: false,
              matchPattern: "packages/**/*",
              path: withWindowsPath("packages/fail1"),
              aliases: [],
              scripts: ["test-exit"],
              dependencies: [],
              dependents: [],
            },
          },
          signal: null,
          success: false,
          exitCode: 1,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
        },
        {
          metadata: {
            workspace: {
              name: "fail2",
              isRoot: false,
              matchPattern: "packages/**/*",
              path: withWindowsPath("packages/fail2"),
              aliases: [],
              scripts: ["test-exit"],
              dependencies: [],
              dependents: [],
            },
          },
          signal: null,
          success: false,
          exitCode: 2,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
        },
        {
          metadata: {
            workspace: {
              name: "success1",
              isRoot: false,
              matchPattern: "packages/**/*",
              path: withWindowsPath("packages/success1"),
              aliases: [],
              scripts: ["test-exit"],
              dependencies: [],
              dependents: [],
            },
          },
          signal: null,
          success: true,
          exitCode: 0,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
        },
        {
          metadata: {
            workspace: {
              name: "success2",
              isRoot: false,
              matchPattern: "packages/**/*",
              path: withWindowsPath("packages/success2"),
              aliases: [],
              scripts: ["test-exit"],
              dependencies: [],
              dependents: [],
            },
          },
          signal: null,
          success: true,
          exitCode: 0,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
        },
      ],
    });

    for (const { startTimeISO, endTimeISO, durationMs } of [
      json,
      ...json.scriptResults,
    ]) {
      expect(startTimeISO).toStartWith(new Date().toISOString().slice(0, 10));
      expect(endTimeISO).toStartWith(new Date().toISOString().slice(0, 10));
      expect(durationMs).toBe(
        new Date(endTimeISO).getTime() - new Date(startTimeISO).getTime(),
      );
    }
  });

  test("JSON output file - relative path with --cwd global option", async () => {
    const { run } = setupCliTest({
      testProject: "simple1",
    });

    const result = await run(
      "--cwd",
      getProjectRoot("simple1"),
      "run-script",
      "application-a",
      "--args=test-args",
      "--json-outfile",
      "test-output/results.json", // for gitignore
    );

    expect(result.exitCode).toBe(0);
    expect(
      JSON.parse(
        fs.readFileSync(
          path.resolve(getProjectRoot("simple1"), "test-output/results.json"),
          "utf8",
        ),
      ),
    ).toEqual({
      totalCount: 1,
      successCount: 1,
      failureCount: 0,
      allSuccess: true,
      startTimeISO: expect.any(String),
      endTimeISO: expect.any(String),
      durationMs: expect.any(Number),
      scriptResults: [
        {
          metadata: {
            workspace: {
              name: "application-1a",
              isRoot: false,
              matchPattern: "applications/*",
              path: withWindowsPath("applications/applicationA"),
              aliases: ["deprecated_appA"],
              scripts: ["a-workspaces", "all-workspaces", "application-a"],
              dependencies: [],
              dependents: [],
            },
          },
          success: true,
          signal: null,
          exitCode: 0,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
        },
      ],
    });

    const resultShort = await run(
      "--cwd",
      getProjectRoot("simple1"),
      "run-script",
      "application-a",
      "-a test-args",
      "-j",
      "test-output/results-short.json", // for gitignore
    );

    expect(resultShort.exitCode).toBe(0);
    expect(
      JSON.parse(
        fs.readFileSync(
          path.resolve(
            getProjectRoot("simple1"),
            "test-output/results-short.json",
          ),
          "utf8",
        ),
      ),
    ).toEqual({
      totalCount: 1,
      successCount: 1,
      failureCount: 0,
      allSuccess: true,
      startTimeISO: expect.any(String),
      endTimeISO: expect.any(String),
      durationMs: expect.any(Number),
      scriptResults: [
        {
          metadata: {
            workspace: {
              name: "application-1a",
              isRoot: false,
              matchPattern: "applications/*",
              path: withWindowsPath("applications/applicationA"),
              aliases: ["deprecated_appA"],
              scripts: ["a-workspaces", "all-workspaces", "application-a"],
              dependencies: [],
              dependents: [],
            },
          },
          success: true,
          signal: null,
          exitCode: 0,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
        },
      ],
    });
  });
});
