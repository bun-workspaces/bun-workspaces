import path from "path";
import { test, expect, describe } from "bun:test";
import { createFileSystemProject } from "../../src";
import { getUserEnvVarName } from "../../src/config/userEnvVars";
import { getProjectRoot, type TestProjectName } from "../fixtures/testProjects";
import {
  setupCliTest,
  assertOutputMatches,
  USAGE_OUTPUT_PATTERN,
} from "../util/cliTestUtils";
import { makeTestWorkspace } from "../util/testData";

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

  describe("--include-root", () => {
    const expectedWorkspaces = [
      makeTestWorkspace({
        name: "application-1a",
        path: "applications/applicationA",
        matchPattern: "applications/*",
        scripts: ["a-workspaces", "all-workspaces", "application-a"],
      }),
      makeTestWorkspace({
        name: "application-1b",
        path: "applications/applicationB",
        matchPattern: "applications/*",
        scripts: ["all-workspaces", "application-b", "b-workspaces"],
      }),
      makeTestWorkspace({
        name: "library-1a",
        path: "libraries/libraryA",
        matchPattern: "libraries/*",
        scripts: ["a-workspaces", "all-workspaces", "library-a"],
      }),
      makeTestWorkspace({
        name: "library-1b",
        path: "libraries/libraryB",
        matchPattern: "libraries/*",
        scripts: ["all-workspaces", "b-workspaces", "library-b"],
      }),
    ];

    const rootWorkspace = makeTestWorkspace({
      name: "test-root",
      isRoot: true,
      path: "",
      matchPattern: "",
      scripts: ["all-workspaces", "root-workspace"],
      aliases: ["my-root-alias"],
    });

    const expectedWithConfigFiles = [
      makeTestWorkspace({
        name: "application-1a",
        path: "applications/applicationA",
        matchPattern: "applications/*",
        scripts: ["a-workspaces", "all-workspaces", "application-a"],
        aliases: ["appA"],
      }),
      makeTestWorkspace({
        name: "application-1b",
        path: "applications/applicationB",
        matchPattern: "applications/*",
        scripts: ["all-workspaces", "application-b", "b-workspaces"],
        aliases: ["appB"],
      }),
      makeTestWorkspace({
        name: "library-1a",
        path: "libraries/libraryA",
        matchPattern: "libraries/*",
        scripts: ["a-workspaces", "all-workspaces", "library-a"],
        aliases: ["libA"],
      }),
      makeTestWorkspace({
        name: "library-1b",
        path: "libraries/libraryB",
        matchPattern: "libraries/*",
        scripts: ["all-workspaces", "b-workspaces", "library-b"],
        aliases: ["libB"],
      }),
    ];

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

      const result = await run("--no-include-root", "ls", "--json");
      expect(result.stderr.raw).toBeEmpty();
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout.raw)).toEqual(expectedWithConfigFiles);
    });
  });

  describe("--workspace-root", () => {
    test.each(
      ["-w", "--workspace-root"].flatMap((flag) => [
        [flag, "."],
        [flag, "applications"],
        [flag, "applications/applicationA"],
        [flag, "libraries"],
        [flag, "libraries/libraryB"],
        [flag, "node_modules/"],
      ]),
    )(
      "finds root (flag: %s) (cwd: %s)",
      async (flag: string, workspacePath: string) => {
        const { run } = setupCliTest({
          workingDirectory: path.resolve(
            getProjectRoot("simple1"),
            workspacePath,
          ),
        });
        const result = await run(flag, "ls", "--json");
        expect(result.stderr.raw).toBeEmpty();
        expect(result.exitCode).toBe(0);
        expect(JSON.parse(result.stdout.raw)).toEqual(
          createFileSystemProject({
            rootDirectory: getProjectRoot("simple1"),
          }).workspaces,
        );
      },
    );

    test("error when no root found", async () => {
      const cwd = path.resolve(process.cwd(), "../../../");
      const { run } = setupCliTest({
        workingDirectory: cwd,
      });
      const result = await run("-w", "ls", "--json");
      expect(result.stdout.raw).toBeEmpty();
      expect(result.exitCode).toBe(1);
      assertOutputMatches(
        result.stderr.sanitized,
        `-w|--workspace-root option: Project root not found from current working directory "${cwd}"`,
      );
    });

    test.each(["short", "long"])(
      "error when both cwd and workspace-root are provided (flag type: %s)",
      async (flagType: "short" | "long") => {
        const cwdFlag = flagType === "short" ? "-d" : "--cwd";
        const workspaceRootFlag =
          flagType === "short" ? "-w" : "--workspace-root";

        const { run } = setupCliTest();
        const result = await run(
          cwdFlag.startsWith("--")
            ? `${cwdFlag}=applications/applicationA`
            : cwdFlag,
          ...(cwdFlag.startsWith("--") ? [] : ["applications/applicationA"]),
          workspaceRootFlag,
          "ls",
          "--json",
        );

        expect(result.stdout.raw).toBeEmpty();
        expect(result.exitCode).toBe(1);
        assertOutputMatches(
          result.stderr.sanitized,
          `Cannot use both --cwd (-d) and --workspace-root (-w) options together`,
        );
      },
    );
  });
});
