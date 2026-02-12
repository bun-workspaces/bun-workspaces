import path from "path";
import { test, expect, describe } from "bun:test";
import { getUserEnvVarName } from "../../src/config/userEnvVars";
import { getProjectRoot } from "../fixtures/testProjects";
import {
  setupCliTest,
  assertOutputMatches,
  USAGE_OUTPUT_PATTERN,
} from "../util/cliTestUtils";
import { withWindowsPath } from "../util/windows";

describe("CLI Global Options", () => {
  describe("usage/help", () => {
    test("--help flag shows usage", async () => {
      const { run } = setupCliTest();
      const result = await run("--help");
      expect(result.stderr.raw).toBeEmpty();
      expect(result.exitCode).toBe(0);
      assertOutputMatches(result.stdout.raw, USAGE_OUTPUT_PATTERN);
    });

    test("help command shows usage", async () => {
      const { run } = setupCliTest();
      const result = await run("help");
      expect(result.stderr.raw).toBeEmpty();
      expect(result.exitCode).toBe(0);
      assertOutputMatches(result.stdout.raw, USAGE_OUTPUT_PATTERN);
    });

    test("empty command shows error with usage", async () => {
      const { run } = setupCliTest();
      const result = await run("");
      assertOutputMatches(
        result.stderr.sanitized,
        /^error: unknown command ''/,
      );
      expect(result.exitCode).toBe(1);
      assertOutputMatches(result.stderr.sanitized, USAGE_OUTPUT_PATTERN);
    });

    test("unknown command shows error with usage", async () => {
      const { run } = setupCliTest();
      const result = await run("something-very-wrong");
      assertOutputMatches(
        result.stderr.sanitized,
        /^error: unknown command 'something-very-wrong'/,
      );
      expect(result.exitCode).toBe(1);
      assertOutputMatches(result.stderr.sanitized, USAGE_OUTPUT_PATTERN);
    });

    test("help command works in invalid project", async () => {
      const { run } = setupCliTest({ testProject: "invalidDuplicateName" });
      const result = await run("help");
      expect(result.stderr.raw).toBeEmpty();
      expect(result.exitCode).toBe(0);
      assertOutputMatches(result.stdout.raw, USAGE_OUTPUT_PATTERN);
    });
  });

  describe("--log-level", () => {
    test("accepts silent level", async () => {
      const { run } = setupCliTest();
      const result = await run("--log-level=silent", "ls");
      expect(result.stderr.raw).toBeEmpty();
      expect(result.exitCode).toBe(0);
    });

    test("accepts debug level", async () => {
      const { run } = setupCliTest();
      const result = await run("--log-level=debug", "ls");
      expect(result.stderr.raw).toBeEmpty();
      expect(result.exitCode).toBe(0);
    });

    test("accepts info level", async () => {
      const { run } = setupCliTest();
      const result = await run("--log-level=info", "ls");
      expect(result.stderr.raw).toBeEmpty();
      expect(result.exitCode).toBe(0);
    });

    test("accepts warn level", async () => {
      const { run } = setupCliTest();
      const result = await run("--log-level=warn", "ls");
      expect(result.stderr.raw).toBeEmpty();
      expect(result.exitCode).toBe(0);
    });

    test("accepts error level", async () => {
      const { run } = setupCliTest();
      const result = await run("--log-level=error", "ls");
      expect(result.stderr.raw).toBeEmpty();
      expect(result.exitCode).toBe(0);
    });

    test("rejects invalid level", async () => {
      const { run } = setupCliTest();
      const result = await run("--log-level=wrong", "ls");
      expect(result.exitCode).toBe(1);
      assertOutputMatches(
        result.stderr.sanitized,
        /option.+--log-level.+wrong.+is invalid/,
      );
    });
  });

  describe("--cwd", () => {
    test("lists workspaces for simple1 project", async () => {
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
    });

    test("lists workspaces for simple2 project", async () => {
      const { run } = setupCliTest();
      const result = await run(
        `--cwd=${getProjectRoot("simple2")}`,
        "ls",
        "--name-only",
      );
      expect(result.stderr.raw).toBeEmpty();
      expect(result.exitCode).toBe(0);
      assertOutputMatches(
        result.stdout.raw,
        /application-2a\napplication-2b\nlibrary-2a\nlibrary-2b$/m,
      );
    });

    test("errors for nonexistent path", async () => {
      const { run } = setupCliTest();
      const result = await run("--cwd=does-not-exist", "ls");
      expect(result.stdout.raw).toBeEmpty();
      expect(result.exitCode).toBe(1);
      assertOutputMatches(
        result.stderr.sanitized,
        /Working directory not found at path "does-not-exist"/,
      );
    });

    test("errors for non-directory path", async () => {
      const { run } = setupCliTest();
      const notADirectoryPath = path.resolve(
        __dirname,
        "../fixtures/not-a-directory",
      );
      const result = await run(`--cwd=${notADirectoryPath}`, "ls");
      expect(result.stdout.raw).toBeEmpty();
      expect(result.exitCode).toBe(1);
      assertOutputMatches(
        result.stderr.sanitized,
        `Working directory is not a directory at path "${notADirectoryPath}"`,
      );
    });
  });

  describe("--config-file", () => {
    test("resolves alias from absolute config path", async () => {
      const { run } = setupCliTest({ testProject: "simple1" });
      const result = await run(
        `--config-file=${path.resolve(getProjectRoot("simple1"), "bw.json")}`,
        "info",
        "deprecated_appA",
      );
      expect(result.stderr.raw).toBeEmpty();
      expect(result.exitCode).toBe(0);
      assertOutputMatches(result.stdout.raw, /Workspace: application-1a/);
    });

    test("resolves alias from alternate config file", async () => {
      const { run } = setupCliTest({ testProject: "simple1" });
      const result = await run(
        `--config-file=${path.resolve(getProjectRoot("simple1"), "bw.alt.json")}`,
        "info",
        "deprecated_appB-alt",
      );
      expect(result.stderr.raw).toBeEmpty();
      expect(result.exitCode).toBe(0);
      assertOutputMatches(result.stdout.raw, /Workspace: application-1b/);
    });

    test("resolves alias from default config in cwd", async () => {
      const { run } = setupCliTest({ testProject: "simple1" });
      const result = await run(
        `--cwd=${getProjectRoot("simple1")}`,
        "info",
        "deprecated_appB",
      );
      expect(result.stderr.raw).toBeEmpty();
      expect(result.exitCode).toBe(0);
      assertOutputMatches(result.stdout.raw, /Workspace: application-1b/);
    });

    test("resolves alias from relative config path with cwd", async () => {
      const { run } = setupCliTest({ testProject: "simple1" });
      const result = await run(
        `--cwd=${getProjectRoot("simple1")}`,
        "--config-file=bw.alt.json",
        "info",
        "deprecated_appB-alt",
      );
      expect(result.stderr.raw).toBeEmpty();
      expect(result.exitCode).toBe(0);
      assertOutputMatches(result.stdout.raw, /Workspace: application-1b/);
    });

    test("errors for nonexistent config file", async () => {
      const { run } = setupCliTest({ testProject: "simple1" });
      const result = await run(
        `--cwd=${getProjectRoot("simple1")}`,
        "--config-file=does-not-exist.json",
        "ls",
      );
      expect(result.stdout.raw).toBeEmpty();
      expect(result.exitCode).toBe(1);
      assertOutputMatches(
        result.stderr.sanitized,
        `Config file not found at path "${path.resolve(getProjectRoot("simple1"), "does-not-exist.json")}"`,
      );
    });

    test("errors for invalid JSON config", async () => {
      const { run } = setupCliTest({ testProject: "simple1" });
      const result = await run(
        `--cwd=${getProjectRoot("invalidBadJsonConfig")}`,
        "ls",
      );
      expect(result.stdout.raw).toBeEmpty();
      expect(result.exitCode).toBe(1);
      assertOutputMatches(
        result.stderr.sanitized,
        `Failed to parse config file at path "${path.resolve(getProjectRoot("invalidBadJsonConfig"), "bw.json")}": JSON Parse error: Property name must be a string literal`,
      );
    });

    test("errors when config root is not an object", async () => {
      const { run } = setupCliTest({ testProject: "simple1" });
      const result = await run(
        `--cwd=${getProjectRoot("invalidBadConfigRoot")}`,
        "ls",
      );
      expect(result.stdout.raw).toBeEmpty();
      expect(result.exitCode).toBe(1);
      assertOutputMatches(
        result.stderr.sanitized,
        `Config file: must be an object`,
      );
    });

    test("errors for invalid workspace aliases config", async () => {
      const { run } = setupCliTest({ testProject: "simple1" });
      const result = await run(
        `--cwd=${getProjectRoot("invalidBadConfigWorkspaceAliases")}`,
        "ls",
      );
      expect(result.stdout.raw).toBeEmpty();
      expect(result.exitCode).toBe(1);
      assertOutputMatches(
        result.stderr.sanitized,
        `Config file: project.workspaceAliases must be an object`,
      );
    });
  });

  describe("--include-root", () => {
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

    const rootWorkspace = {
      name: "test-root",
      isRoot: true,
      matchPattern: "",
      path: "",
      scripts: ["all-workspaces", "root-workspace"],
      aliases: ["my-root-alias"],
      dependencies: [],
      dependents: [],
    };

    const expectedWithRoot = [rootWorkspace, ...expectedWorkspaces];

    test("--include-root flag includes root workspace", async () => {
      const { run } = setupCliTest({ testProject: "withRootWorkspace" });
      const result = await run("--include-root", "ls", "--json");
      expect(result.stderr.raw).toBeEmpty();
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout.raw)).toEqual(expectedWithRoot);
    });

    test("-r shorthand includes root workspace", async () => {
      const { run } = setupCliTest({ testProject: "withRootWorkspace" });
      const result = await run("-r", "ls", "--json");
      expect(result.stderr.raw).toBeEmpty();
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout.raw)).toEqual(expectedWithRoot);
    });

    test("excludes root workspace by default", async () => {
      const { run } = setupCliTest({ testProject: "withRootWorkspace" });
      const result = await run("ls", "--json");
      expect(result.stderr.raw).toBeEmpty();
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout.raw)).toEqual(expectedWorkspaces);
    });

    test("env var includes root workspace", async () => {
      const { run } = setupCliTest({
        testProject: "withRootWorkspace",
        env: { [getUserEnvVarName("includeRootWorkspaceDefault")]: "true" },
      });
      const result = await run("ls", "--json");
      expect(result.stderr.raw).toBeEmpty();
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout.raw)).toEqual(expectedWithRoot);
    });

    test("--no-include-root overrides env var", async () => {
      const { run } = setupCliTest({
        testProject: "withRootWorkspace",
        env: { [getUserEnvVarName("includeRootWorkspaceDefault")]: "true" },
      });
      const result = await run("--no-include-root", "ls", "--json");
      expect(result.stderr.raw).toBeEmpty();
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout.raw)).toEqual(expectedWorkspaces);
    });

    test("env var false excludes root workspace", async () => {
      const { run } = setupCliTest({
        testProject: "withRootWorkspace",
        env: { [getUserEnvVarName("includeRootWorkspaceDefault")]: "false" },
      });
      const result = await run("ls", "--json");
      expect(result.stderr.raw).toBeEmpty();
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout.raw)).toEqual(expectedWorkspaces);
    });

    test("config file includes root workspace", async () => {
      const { run } = setupCliTest({
        testProject: "withRootWorkspaceWithConfigFiles",
      });

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

      const result = await run("ls", "--json");
      expect(result.stderr.raw).toBeEmpty();
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout.raw)).toEqual([
        rootWorkspace,
        ...expectedWithConfigFiles,
      ]);
    });

    test("--no-include-root overrides config file", async () => {
      const { run } = setupCliTest({
        testProject: "withRootWorkspaceWithConfigFiles",
      });

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

      const result = await run("--no-include-root", "ls", "--json");
      expect(result.stderr.raw).toBeEmpty();
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout.raw)).toEqual(expectedWithConfigFiles);
    });
  });
});
