import path from "path";
import { test, expect, describe } from "bun:test";
import { getUserEnvVarName } from "../src/config/userEnvVars";
import { getProjectRoot } from "./testProjects";
import {
  setupCliTest,
  assertOutputMatches,
  USAGE_OUTPUT_PATTERN,
} from "./util/cliTestUtils";
import { withWindowsPath } from "./util/windows";

describe("Test CLI Global Options", () => {
  test("Usage shows", async () => {
    const { run } = setupCliTest();

    const helpResult = await run("--help");
    expect(helpResult.stderr.raw).toBeEmpty();
    expect(helpResult.exitCode).toBe(0);
    assertOutputMatches(helpResult.stdout.raw, USAGE_OUTPUT_PATTERN);

    const helpResult2 = await run("help");
    expect(helpResult2.stderr.raw).toBeEmpty();
    expect(helpResult2.exitCode).toBe(0);
    assertOutputMatches(helpResult2.stdout.raw, USAGE_OUTPUT_PATTERN);

    const helpResult3 = await run("");
    assertOutputMatches(
      helpResult3.stderr.sanitized,
      /^error: unknown command ''/,
    );
    expect(helpResult3.exitCode).toBe(1);
    assertOutputMatches(helpResult3.stderr.sanitized, USAGE_OUTPUT_PATTERN);

    const helpResult4 = await run("something-very-wrong");
    assertOutputMatches(
      helpResult4.stderr.sanitized,
      /^error: unknown command 'something-very-wrong'/,
    );
    expect(helpResult4.exitCode).toBe(1);
    assertOutputMatches(helpResult4.stderr.sanitized, USAGE_OUTPUT_PATTERN);
  });

  test("Usage shows for help command in invalid project", async () => {
    const { run } = setupCliTest({ testProject: "invalidDuplicateName" });

    const helpResult = await run("help");
    expect(helpResult.stderr.raw).toBeEmpty();
    expect(helpResult.exitCode).toBe(0);
    assertOutputMatches(helpResult.stdout.raw, USAGE_OUTPUT_PATTERN);
  });

  test("Global Option --log-level", async () => {
    const { run } = setupCliTest();

    const silentLogLevelResult = await run("--log-level=silent", "ls");
    expect(silentLogLevelResult.stderr.raw).toBeEmpty();
    expect(silentLogLevelResult.exitCode).toBe(0);

    const debugLogLevelResult = await run("--log-level=debug", "ls");
    expect(debugLogLevelResult.stderr.raw).toBeEmpty();
    expect(debugLogLevelResult.exitCode).toBe(0);

    const infoLogLevelResult = await run("--log-level=info", "ls");
    expect(infoLogLevelResult.stderr.raw).toBeEmpty();
    expect(infoLogLevelResult.exitCode).toBe(0);

    const warnLogLevelResult = await run("--log-level=warn", "ls");
    expect(warnLogLevelResult.stderr.raw).toBeEmpty();
    expect(warnLogLevelResult.exitCode).toBe(0);

    const errorLogLevelResult = await run("--log-level=error", "ls");
    expect(errorLogLevelResult.stderr.raw).toBeEmpty();
    expect(errorLogLevelResult.exitCode).toBe(0);

    const wrongLogLevelResult = await run("--log-level=wrong", "ls");
    expect(wrongLogLevelResult.exitCode).toBe(1);
    assertOutputMatches(
      wrongLogLevelResult.stderr.sanitized,
      /option.+--log-level.+wrong.+is invalid/,
    );
  });

  test("Global Option --cwd", async () => {
    const { run } = setupCliTest();

    const result = await run(
      `--cwd=${getProjectRoot("simple1")}`,
      "ls",
      "--name-only",
    );
    expect(result.stderr.raw).toBeEmpty();
    expect(result.exitCode).toBe(0);
    assertOutputMatches(
      result.stdout.raw,
      /application-1a\napplication-1b\nlibrary-1a\nlibrary-1b$/m,
    );

    const result2 = await run(
      `--cwd=${getProjectRoot("simple2")}`,
      "ls",
      "--name-only",
    );
    expect(result2.stderr.raw).toBeEmpty();
    expect(result2.exitCode).toBe(0);
    assertOutputMatches(
      result2.stdout.raw,
      /application-2a\napplication-2b\nlibrary-2a\nlibrary-2b$/m,
    );

    const result3 = await run("--cwd=does-not-exist", "ls");
    expect(result3.stdout.raw).toBeEmpty();
    expect(result3.exitCode).toBe(1);
    assertOutputMatches(
      result3.stderr.sanitized,
      /Working directory not found at path "does-not-exist"/,
    );

    const notADirectoryPath = path.resolve(__dirname, "util/not-a-directory");
    const result4 = await run(`--cwd=${notADirectoryPath}`, "ls");
    expect(result4.stdout.raw).toBeEmpty();
    expect(result4.exitCode).toBe(1);
    assertOutputMatches(
      result4.stderr.sanitized,
      `Working directory is not a directory at path "${notADirectoryPath}"`,
    );
  });

  test("Global Option --config-file", async () => {
    const { run } = setupCliTest({ testProject: "simple1" });

    const result = await run(
      `--config-file=${path.resolve(getProjectRoot("simple1"), "bw.json")}`,
      "info",
      "deprecated_appA",
    );
    expect(result.stderr.raw).toBeEmpty();
    expect(result.exitCode).toBe(0);
    assertOutputMatches(result.stdout.raw, /Workspace: application-1a/);

    const result2 = await run(
      `--config-file=${path.resolve(getProjectRoot("simple1"), "bw.alt.json")}`,
      "info",
      "deprecated_appB-alt",
    );
    expect(result2.stderr.raw).toBeEmpty();
    expect(result2.exitCode).toBe(0);
    assertOutputMatches(result2.stdout.raw, /Workspace: application-1b/);

    const result3 = await run(
      `--cwd=${getProjectRoot("simple1")}`,
      "info",
      "deprecated_appB",
    );
    expect(result3.stderr.raw).toBeEmpty();
    expect(result3.exitCode).toBe(0);
    assertOutputMatches(result3.stdout.raw, /Workspace: application-1b/);

    const result4 = await run(
      `--cwd=${getProjectRoot("simple1")}`,
      "--config-file=bw.alt.json",
      "info",
      "deprecated_appB-alt",
    );
    expect(result4.stderr.raw).toBeEmpty();
    expect(result4.exitCode).toBe(0);
    assertOutputMatches(result4.stdout.raw, /Workspace: application-1b/);

    const result5 = await run(
      `--cwd=${getProjectRoot("simple1")}`,
      "--config-file=does-not-exist.json",
      "ls",
    );
    expect(result5.stdout.raw).toBeEmpty();
    expect(result5.exitCode).toBe(1);
    assertOutputMatches(
      result5.stderr.sanitized,
      `Config file not found at path "${path.resolve(getProjectRoot("simple1"), "does-not-exist.json")}"`,
    );

    const result6 = await run(
      `--cwd=${getProjectRoot("invalidBadJsonConfig")}`,
      "ls",
    );
    expect(result6.stdout.raw).toBeEmpty();
    expect(result6.exitCode).toBe(1);
    assertOutputMatches(
      result6.stderr.sanitized,
      `Failed to parse config file at path "${path.resolve(getProjectRoot("invalidBadJsonConfig"), "bw.json")}": JSON Parse error: Property name must be a string literal`,
    );

    const result7 = await run(
      `--cwd=${getProjectRoot("invalidBadConfigRoot")}`,
      "ls",
    );
    expect(result7.stdout.raw).toBeEmpty();
    expect(result7.exitCode).toBe(1);
    assertOutputMatches(
      result7.stderr.sanitized,
      `Config file: must be an object`,
    );

    const result8 = await run(
      `--cwd=${getProjectRoot("invalidBadConfigWorkspaceAliases")}`,
      "ls",
    );
    expect(result8.stdout.raw).toBeEmpty();
    expect(result8.exitCode).toBe(1);
    assertOutputMatches(
      result8.stderr.sanitized,
      `Config file: project.workspaceAliases must be an object`,
    );
  });

  test("Global Option --include-root", async () => {
    const { run } = setupCliTest({ testProject: "withRootWorkspace" });

    const resultLong = await run("--include-root", "ls", "--json");
    expect(resultLong.stderr.raw).toBeEmpty();
    expect(resultLong.exitCode).toBe(0);

    const resultShort = await run("-r", "ls", "--json");
    expect(resultShort.stderr.raw).toBeEmpty();
    expect(resultShort.exitCode).toBe(0);

    const resultFalse = await run("ls", "--json");
    expect(resultFalse.stderr.raw).toBeEmpty();
    expect(resultFalse.exitCode).toBe(0);

    const { run: runWithEnv } = setupCliTest({
      testProject: "withRootWorkspace",
      env: { [getUserEnvVarName("includeRootWorkspaceDefault")]: "true" },
    });

    const resultEnv = await runWithEnv("ls", "--json");
    expect(resultEnv.stderr.raw).toBeEmpty();
    expect(resultEnv.exitCode).toBe(0);

    const resultEnvOverride = await runWithEnv(
      "--no-include-root",
      "ls",
      "--json",
    );
    expect(resultEnvOverride.stderr.raw).toBeEmpty();
    expect(resultEnvOverride.exitCode).toBe(0);

    const { run: runWithEnvFalse } = setupCliTest({
      testProject: "withRootWorkspace",
      env: { [getUserEnvVarName("includeRootWorkspaceDefault")]: "false" },
    });

    const resultEnvFalse = await runWithEnvFalse("ls", "--json");
    expect(resultEnvFalse.stderr.raw).toBeEmpty();
    expect(resultEnvFalse.exitCode).toBe(0);

    const expectedWorkspaces = [
      {
        name: "application-1a",
        isRoot: false,
        matchPattern: "applications/*",
        path: withWindowsPath("applications/applicationA"),
        scripts: ["a-workspaces", "all-workspaces", "application-a"],
        aliases: [],
        dependencies: [],
        dependents: [],
      },
      {
        name: "application-1b",
        isRoot: false,
        matchPattern: "applications/*",
        path: withWindowsPath("applications/applicationB"),
        scripts: ["all-workspaces", "application-b", "b-workspaces"],
        aliases: [],
        dependencies: [],
        dependents: [],
      },
      {
        name: "library-1a",
        isRoot: false,
        matchPattern: "libraries/*",
        path: withWindowsPath("libraries/libraryA"),
        scripts: ["a-workspaces", "all-workspaces", "library-a"],
        aliases: [],
        dependencies: [],
        dependents: [],
      },
      {
        name: "library-1b",
        isRoot: false,
        matchPattern: "libraries/*",
        path: withWindowsPath("libraries/libraryB"),
        scripts: ["all-workspaces", "b-workspaces", "library-b"],
        aliases: [],
        dependencies: [],
        dependents: [],
      },
    ];

    const expectedWithRoot = [
      {
        name: "test-root",
        isRoot: true,
        matchPattern: "",
        path: "",
        scripts: ["all-workspaces", "root-workspace"],
        aliases: ["my-root-alias"],
        dependencies: [],
        dependents: [],
      },
      ...expectedWorkspaces,
    ];

    expect(JSON.parse(resultLong.stdout.raw)).toEqual(expectedWithRoot);
    expect(JSON.parse(resultShort.stdout.raw)).toEqual(expectedWithRoot);
    expect(JSON.parse(resultFalse.stdout.raw)).toEqual(expectedWorkspaces);
    expect(JSON.parse(resultEnv.stdout.raw)).toEqual(expectedWithRoot);
    expect(JSON.parse(resultEnvOverride.stdout.raw)).toEqual(
      expectedWorkspaces,
    );
    expect(JSON.parse(resultEnvFalse.stdout.raw)).toEqual(expectedWorkspaces);

    const { run: runWithConfigFile } = setupCliTest({
      testProject: "withRootWorkspaceWithConfigFiles",
    });

    const resultConfigFile = await runWithConfigFile("ls", "--json");
    expect(resultConfigFile.stderr.raw).toBeEmpty();
    expect(resultConfigFile.exitCode).toBe(0);

    const resultConfigFileFalse = await runWithConfigFile(
      "--no-include-root",
      "ls",
      "--json",
    );
    expect(resultConfigFileFalse.stderr.raw).toBeEmpty();
    expect(resultConfigFileFalse.exitCode).toBe(0);

    const expectedWithConfigFiles = [
      {
        name: "application-1a",
        isRoot: false,
        matchPattern: "applications/*",
        path: withWindowsPath("applications/applicationA"),
        scripts: ["a-workspaces", "all-workspaces", "application-a"],
        aliases: ["appA"],
        dependencies: [],
        dependents: [],
      },
      {
        name: "application-1b",
        isRoot: false,
        matchPattern: "applications/*",
        path: withWindowsPath("applications/applicationB"),
        scripts: ["all-workspaces", "application-b", "b-workspaces"],
        aliases: ["appB"],
        dependencies: [],
        dependents: [],
      },
      {
        name: "library-1a",
        isRoot: false,
        matchPattern: "libraries/*",
        path: withWindowsPath("libraries/libraryA"),
        scripts: ["a-workspaces", "all-workspaces", "library-a"],
        aliases: ["libA"],
        dependencies: [],
        dependents: [],
      },
      {
        name: "library-1b",
        isRoot: false,
        matchPattern: "libraries/*",
        path: withWindowsPath("libraries/libraryB"),
        scripts: ["all-workspaces", "b-workspaces", "library-b"],
        aliases: ["libB"],
        dependencies: [],
        dependents: [],
      },
    ];

    expect(JSON.parse(resultConfigFile.stdout.raw)).toEqual([
      {
        name: "test-root",
        isRoot: true,
        matchPattern: "",
        path: "",
        scripts: ["all-workspaces", "root-workspace"],
        aliases: ["my-root-alias"],
        dependencies: [],
        dependents: [],
      },
      ...expectedWithConfigFiles,
    ]);

    expect(JSON.parse(resultConfigFileFalse.stdout.raw)).toEqual(
      expectedWithConfigFiles,
    );
  });
});
