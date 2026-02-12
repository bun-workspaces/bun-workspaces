import { test, expect, describe } from "bun:test";
import { getCliCommandConfig, type CliCommandName } from "../src/cli/commands";
import { getProjectRoot } from "./fixtures/testProjects";
import { setupCliTest, assertOutputMatches } from "./util/cliTestUtils";
import { withWindowsPath } from "./util/windows";

const listCommandAndAliases = (commandName: CliCommandName) => {
  const config = getCliCommandConfig(commandName);
  return [config.command.split(/\s+/)[0], ...config.aliases];
};

describe("Test CLI commands", () => {
  test.each(listCommandAndAliases("listWorkspaces"))(
    "List Workspaces: %s",
    async (command) => {
      const { run } = setupCliTest({
        testProject: "simple1",
      });

      const plainResult = await run(command);
      expect(plainResult.stderr.raw).toBeEmpty();
      expect(plainResult.exitCode).toBe(0);
      assertOutputMatches(
        plainResult.stdout.raw,
        `Workspace: application-1a
 - Aliases: deprecated_appA
 - Path: ${withWindowsPath("applications/applicationA")}
 - Glob Match: applications/*
 - Scripts: a-workspaces, all-workspaces, application-a
Workspace: application-1b
 - Aliases: deprecated_appB
 - Path: ${withWindowsPath("applications/applicationB")}
 - Glob Match: applications/*
 - Scripts: all-workspaces, application-b, b-workspaces
Workspace: library-1a
 - Aliases: deprecated_libA
 - Path: ${withWindowsPath("libraries/libraryA")}
 - Glob Match: libraries/*
 - Scripts: a-workspaces, all-workspaces, library-a
Workspace: library-1b
 - Aliases: deprecated_libB
 - Path: ${withWindowsPath("libraries/libraryB")}
 - Glob Match: libraries/*
 - Scripts: all-workspaces, b-workspaces, library-b`,
      );

      const nameOnlyResult = await run(command, "--name-only");
      expect(nameOnlyResult.stderr.raw).toBeEmpty();
      expect(nameOnlyResult.exitCode).toBe(0);
      assertOutputMatches(
        nameOnlyResult.stdout.raw,
        `application-1a
application-1b
library-1a
library-1b`,
      );

      const expectedJson = [
        {
          name: "application-1a",
          isRoot: false,
          matchPattern: "applications/*",
          path: withWindowsPath("applications/applicationA"),
          scripts: ["a-workspaces", "all-workspaces", "application-a"],
          aliases: ["deprecated_appA"],
          dependencies: [],
          dependents: [],
        },
        {
          name: "application-1b",
          isRoot: false,
          matchPattern: "applications/*",
          path: withWindowsPath("applications/applicationB"),
          scripts: ["all-workspaces", "application-b", "b-workspaces"],
          aliases: ["deprecated_appB"],
          dependencies: [],
          dependents: [],
        },
        {
          name: "library-1a",
          isRoot: false,
          matchPattern: "libraries/*",
          path: withWindowsPath("libraries/libraryA"),
          scripts: ["a-workspaces", "all-workspaces", "library-a"],
          aliases: ["deprecated_libA"],
          dependencies: [],
          dependents: [],
        },
        {
          name: "library-1b",
          isRoot: false,
          matchPattern: "libraries/*",
          path: withWindowsPath("libraries/libraryB"),
          scripts: ["all-workspaces", "b-workspaces", "library-b"],
          aliases: ["deprecated_libB"],
          dependencies: [],
          dependents: [],
        },
      ];

      const jsonResult = await run(command, "--json");
      expect(jsonResult.stderr.raw).toBeEmpty();
      expect(jsonResult.exitCode).toBe(0);
      assertOutputMatches(jsonResult.stdout.raw, JSON.stringify(expectedJson));

      const jsonShortResult = await run(command, "-j");
      expect(jsonShortResult.stderr.raw).toBeEmpty();
      expect(jsonShortResult.exitCode).toBe(0);
      assertOutputMatches(
        jsonShortResult.stdout.raw,
        JSON.stringify(expectedJson),
      );

      const jsonPrettyResult = await run(command, "--json", "--pretty");
      expect(jsonPrettyResult.stderr.raw).toBeEmpty();
      expect(jsonPrettyResult.exitCode).toBe(0);
      assertOutputMatches(
        jsonPrettyResult.stdout.raw,
        JSON.stringify(expectedJson, null, 2),
      );

      const jsonPrettyShortResult = await run(command, "-j", "--pretty");
      expect(jsonPrettyShortResult.stderr.raw).toBeEmpty();
      expect(jsonPrettyShortResult.exitCode).toBe(0);
      assertOutputMatches(
        jsonPrettyShortResult.stdout.raw,
        JSON.stringify(expectedJson, null, 2),
      );

      const jsonNameOnlyResult = await run(command, "--name-only", "--json");
      expect(jsonNameOnlyResult.stderr.raw).toBeEmpty();
      expect(jsonNameOnlyResult.exitCode).toBe(0);
      assertOutputMatches(
        jsonNameOnlyResult.stdout.raw,
        JSON.stringify(expectedJson.map(({ name }) => name)),
      );

      const jsonNameOnlyShortResult = await run(command, "-n", "--json");
      expect(jsonNameOnlyShortResult.stderr.raw).toBeEmpty();
      expect(jsonNameOnlyShortResult.exitCode).toBe(0);
      assertOutputMatches(
        jsonNameOnlyShortResult.stdout.raw,
        JSON.stringify(expectedJson.map(({ name }) => name)),
      );

      const jsonNameOnlyPrettyResult = await run(
        command,
        "--name-only",
        "--json",
        "--pretty",
      );
      expect(jsonNameOnlyPrettyResult.stderr.raw).toBeEmpty();
      expect(jsonNameOnlyPrettyResult.exitCode).toBe(0);
      assertOutputMatches(
        jsonNameOnlyPrettyResult.stdout.raw,
        JSON.stringify(
          expectedJson.map(({ name }) => name),
          null,
          2,
        ),
      );

      const emptyWorkspacesResult = await setupCliTest({
        testProject: "emptyWorkspaces",
      }).run(command);
      expect(emptyWorkspacesResult.stdout.raw).toBeEmpty();
      expect(emptyWorkspacesResult.exitCode).toBe(1);
      assertOutputMatches(
        emptyWorkspacesResult.stderr.sanitizedCompactLines,
        `No bun.lock found at ${withWindowsPath(getProjectRoot("emptyWorkspaces"))}. Check that this is the directory of your project and that you've ran 'bun install'. ` +
          "If you have ran 'bun install', you may simply have no workspaces or dependencies in your project.",
      );

      const patternOutput = `Workspace: application-1a
 - Aliases: deprecated_appA
 - Path: ${withWindowsPath("applications/applicationA")}
 - Glob Match: applications/*
 - Scripts: a-workspaces, all-workspaces, application-a
Workspace: application-1b
 - Aliases: deprecated_appB
 - Path: ${withWindowsPath("applications/applicationB")}
 - Glob Match: applications/*
 - Scripts: all-workspaces, application-b, b-workspaces
Workspace: library-1b
 - Aliases: deprecated_libB
 - Path: ${withWindowsPath("libraries/libraryB")}
 - Glob Match: libraries/*
 - Scripts: all-workspaces, b-workspaces, library-b`;

      const workspacePatternsResult = await run(
        command,
        "name:application-*",
        "library-1b",
      );
      expect(workspacePatternsResult.stderr.raw).toBeEmpty();
      expect(workspacePatternsResult.exitCode).toBe(0);
      assertOutputMatches(workspacePatternsResult.stdout.raw, patternOutput);

      const workspacePatternsOptionResult = await run(
        command,
        "--workspace-patterns=application-* path:libraries/**/*B",
      );
      expect(workspacePatternsOptionResult.stderr.raw).toBeEmpty();
      expect(workspacePatternsOptionResult.exitCode).toBe(0);
      assertOutputMatches(
        workspacePatternsOptionResult.stdout.raw,
        patternOutput,
      );

      const workspacePatternsOptionShortResult = await run(
        command,
        "-W",
        "application-* library-1b",
      );
      expect(workspacePatternsOptionShortResult.stderr.raw).toBeEmpty();
      expect(workspacePatternsOptionShortResult.exitCode).toBe(0);
      assertOutputMatches(
        workspacePatternsOptionShortResult.stdout.raw,
        patternOutput,
      );

      const workspacePatternsOptionAndPatternResult = await run(
        command,
        "--workspace-patterns=application-* library-1b",
        "application-*",
        "library-1b",
      );
      expect(workspacePatternsOptionAndPatternResult.stdout.raw).toBeEmpty();
      expect(workspacePatternsOptionAndPatternResult.exitCode).toBe(1);
      assertOutputMatches(
        workspacePatternsOptionAndPatternResult.stderr.sanitized,
        "CLI syntax error: Cannot use both inline workspace patterns and --workspace-patterns|-W option",
      );
    },
  );

  test.each(listCommandAndAliases("listScripts"))(
    "List Scripts: %s",
    async (command) => {
      const { run } = setupCliTest({
        testProject: "simple1",
      });

      const plainResult = await run(command);
      assertOutputMatches(
        plainResult.stdout.raw,
        `Script: a-workspaces
 - application-1a
 - library-1a
Script: all-workspaces
 - application-1a
 - application-1b
 - library-1a
 - library-1b
Script: application-a
 - application-1a
Script: application-b
 - application-1b
Script: b-workspaces
 - application-1b
 - library-1b
Script: library-a
 - library-1a
Script: library-b
 - library-1b`,
      );
      expect(plainResult.stderr.raw).toBeEmpty();

      const expectedJson = [
        {
          name: "a-workspaces",
          workspaces: ["application-1a", "library-1a"],
        },
        {
          name: "all-workspaces",
          workspaces: [
            "application-1a",
            "application-1b",
            "library-1a",
            "library-1b",
          ],
        },
        {
          name: "application-a",
          workspaces: ["application-1a"],
        },
        {
          name: "application-b",
          workspaces: ["application-1b"],
        },
        {
          name: "b-workspaces",
          workspaces: ["application-1b", "library-1b"],
        },
        {
          name: "library-a",
          workspaces: ["library-1a"],
        },
        {
          name: "library-b",
          workspaces: ["library-1b"],
        },
      ];

      const jsonResult = await run(command, "--json");
      expect(jsonResult.stderr.raw).toBeEmpty();
      expect(jsonResult.exitCode).toBe(0);
      assertOutputMatches(jsonResult.stdout.raw, JSON.stringify(expectedJson));

      const jsonShortResult = await run(command, "-j");
      expect(jsonShortResult.stderr.raw).toBeEmpty();
      expect(jsonShortResult.exitCode).toBe(0);
      assertOutputMatches(
        jsonShortResult.stdout.raw,
        JSON.stringify(expectedJson),
      );

      const jsonPrettyResult = await run(command, "--json", "--pretty");
      expect(jsonPrettyResult.stderr.raw).toBeEmpty();
      expect(jsonPrettyResult.exitCode).toBe(0);
      assertOutputMatches(
        jsonPrettyResult.stdout.raw,
        JSON.stringify(expectedJson, null, 2),
      );

      const jsonPrettyShortResult = await run(command, "-j", "-p");
      expect(jsonPrettyShortResult.stderr.raw).toBeEmpty();
      expect(jsonPrettyShortResult.exitCode).toBe(0);
      assertOutputMatches(
        jsonPrettyShortResult.stdout.raw,
        JSON.stringify(expectedJson, null, 2),
      );

      const jsonNameOnlyResult = await run(command, "--name-only", "--json");
      expect(jsonNameOnlyResult.stderr.raw).toBeEmpty();
      expect(jsonNameOnlyResult.exitCode).toBe(0);
      assertOutputMatches(
        jsonNameOnlyResult.stdout.raw,
        JSON.stringify(expectedJson.map(({ name }) => name)),
      );

      const jsonNameOnlyShortResult = await run(command, "-n", "-j");
      expect(jsonNameOnlyShortResult.stderr.raw).toBeEmpty();
      expect(jsonNameOnlyShortResult.exitCode).toBe(0);
      assertOutputMatches(
        jsonNameOnlyShortResult.stdout.raw,
        JSON.stringify(expectedJson.map(({ name }) => name)),
      );

      const jsonNameOnlyPrettyResult = await run(
        command,
        "--name-only",
        "--json",
        "--pretty",
      );
      expect(jsonNameOnlyPrettyResult.stderr.raw).toBeEmpty();
      expect(jsonNameOnlyPrettyResult.exitCode).toBe(0);
      assertOutputMatches(
        jsonNameOnlyPrettyResult.stdout.raw,
        JSON.stringify(
          expectedJson.map(({ name }) => name),
          null,
          2,
        ),
      );

      const jsonNameOnlyPrettyShortResult = await run(
        command,
        "-n",
        "-j",
        "-p",
      );
      expect(jsonNameOnlyPrettyShortResult.stderr.raw).toBeEmpty();
      expect(jsonNameOnlyPrettyShortResult.exitCode).toBe(0);
      assertOutputMatches(
        jsonNameOnlyPrettyShortResult.stdout.raw,
        JSON.stringify(
          expectedJson.map(({ name }) => name),
          null,
          2,
        ),
      );

      const emptyWorkspacesResult = await setupCliTest({
        testProject: "emptyWorkspaces",
      }).run(command);

      expect(emptyWorkspacesResult.stdout.raw).toBeEmpty();
      expect(emptyWorkspacesResult.exitCode).toBe(1);
      assertOutputMatches(
        emptyWorkspacesResult.stderr.sanitizedCompactLines,
        `No bun.lock found at ${withWindowsPath(getProjectRoot("emptyWorkspaces"))}. Check that this is the directory of your project and that you've ran 'bun install'. ` +
          "If you have ran 'bun install', you may simply have no workspaces or dependencies in your project.",
      );

      const emptyScriptsResult = await setupCliTest({
        testProject: "emptyScripts",
      }).run(command);
      expect(emptyScriptsResult.stderr.raw).toBeEmpty();
      expect(emptyScriptsResult.exitCode).toBe(0);
      assertOutputMatches(emptyScriptsResult.stdout.raw, "No scripts found");
    },
  );

  test.each(listCommandAndAliases("workspaceInfo"))(
    "Workspace Info: %s",
    async (command) => {
      const { run } = setupCliTest({
        testProject: "simple1",
      });

      const plainResult = await run(command, "application-1a");
      expect(plainResult.stderr.raw).toBeEmpty();
      expect(plainResult.exitCode).toBe(0);
      assertOutputMatches(
        plainResult.stdout.raw,
        `Workspace: application-1a
 - Aliases: deprecated_appA
 - Path: ${withWindowsPath("applications/applicationA")}
 - Glob Match: applications/*
 - Scripts: a-workspaces, all-workspaces, application-a`,
      );

      const jsonResult = await run(command, "application-1a", "--json");
      expect(jsonResult.stderr.raw).toBeEmpty();
      expect(jsonResult.exitCode).toBe(0);
      assertOutputMatches(
        jsonResult.stdout.raw,
        JSON.stringify({
          name: "application-1a",
          isRoot: false,
          matchPattern: "applications/*",
          path: withWindowsPath("applications/applicationA"),
          scripts: ["a-workspaces", "all-workspaces", "application-a"],
          aliases: ["deprecated_appA"],
          dependencies: [],
          dependents: [],
        }),
      );

      const jsonShortResult = await run(command, "application-1a", "-j");
      expect(jsonShortResult.stderr.raw).toBeEmpty();
      expect(jsonShortResult.exitCode).toBe(0);
      assertOutputMatches(
        jsonShortResult.stdout.raw,
        JSON.stringify({
          name: "application-1a",
          isRoot: false,
          matchPattern: "applications/*",
          path: withWindowsPath("applications/applicationA"),
          scripts: ["a-workspaces", "all-workspaces", "application-a"],
          aliases: ["deprecated_appA"],
          dependencies: [],
          dependents: [],
        }),
      );

      const jsonPrettyResult = await run(
        command,
        "application-1a",
        "--json",
        "--pretty",
      );
      expect(jsonPrettyResult.stderr.raw).toBeEmpty();
      expect(jsonPrettyResult.exitCode).toBe(0);
      assertOutputMatches(
        jsonPrettyResult.stdout.raw,
        JSON.stringify(
          {
            name: "application-1a",
            isRoot: false,
            matchPattern: "applications/*",
            path: withWindowsPath("applications/applicationA"),
            scripts: ["a-workspaces", "all-workspaces", "application-a"],
            aliases: ["deprecated_appA"],
            dependencies: [],
            dependents: [],
          },
          null,
          2,
        ),
      );

      const jsonPrettyShortResult = await run(
        command,
        "application-1a",
        "-j",
        "-p",
      );
      expect(jsonPrettyShortResult.stderr.raw).toBeEmpty();
      expect(jsonPrettyShortResult.exitCode).toBe(0);
      assertOutputMatches(
        jsonPrettyShortResult.stdout.raw,
        JSON.stringify(
          {
            name: "application-1a",
            isRoot: false,
            matchPattern: "applications/*",
            path: withWindowsPath("applications/applicationA"),
            scripts: ["a-workspaces", "all-workspaces", "application-a"],
            aliases: ["deprecated_appA"],
            dependencies: [],
            dependents: [],
          },
          null,
          2,
        ),
      );

      const doesNotExistResult = await run(command, "does-not-exist");
      expect(doesNotExistResult.stdout.raw).toBeEmpty();
      expect(doesNotExistResult.exitCode).toBe(1);
      assertOutputMatches(
        doesNotExistResult.stderr.sanitized,
        'Workspace "does-not-exist" not found',
      );
    },
  );

  test.each(listCommandAndAliases("scriptInfo"))(
    "Script Info: %s",
    async (command) => {
      const { run } = setupCliTest({
        testProject: "simple1",
      });

      const multipleWorkspacesResult = await run(command, "all-workspaces");
      expect(multipleWorkspacesResult.stderr.raw).toBeEmpty();
      expect(multipleWorkspacesResult.exitCode).toBe(0);
      assertOutputMatches(
        multipleWorkspacesResult.stdout.raw,
        `Script: all-workspaces
 - application-1a
 - application-1b
 - library-1a
 - library-1b`,
      );

      const singleWorkspaceResult = await run(command, "application-a");
      expect(singleWorkspaceResult.stderr.raw).toBeEmpty();
      expect(singleWorkspaceResult.exitCode).toBe(0);
      assertOutputMatches(
        singleWorkspaceResult.stdout.raw,
        `Script: application-a
 - application-1a`,
      );

      const jsonResult = await run(command, "all-workspaces", "--json");
      expect(jsonResult.stderr.raw).toBeEmpty();
      expect(jsonResult.exitCode).toBe(0);
      assertOutputMatches(
        jsonResult.stdout.raw,
        JSON.stringify({
          name: "all-workspaces",
          workspaces: [
            "application-1a",
            "application-1b",
            "library-1a",
            "library-1b",
          ],
        }),
      );

      const jsonShortResult = await run(command, "all-workspaces", "-j");
      expect(jsonShortResult.stderr.raw).toBeEmpty();
      expect(jsonShortResult.exitCode).toBe(0);
      assertOutputMatches(
        jsonShortResult.stdout.raw,
        JSON.stringify({
          name: "all-workspaces",
          workspaces: [
            "application-1a",
            "application-1b",
            "library-1a",
            "library-1b",
          ],
        }),
      );

      const jsonPrettyResult = await run(
        command,
        "all-workspaces",
        "--json",
        "--pretty",
      );
      expect(jsonPrettyResult.stderr.raw).toBeEmpty();
      expect(jsonPrettyResult.exitCode).toBe(0);
      assertOutputMatches(
        jsonPrettyResult.stdout.raw,
        JSON.stringify(
          {
            name: "all-workspaces",
            workspaces: [
              "application-1a",
              "application-1b",
              "library-1a",
              "library-1b",
            ],
          },
          null,
          2,
        ),
      );

      const jsonPrettyShortResult = await run(
        command,
        "all-workspaces",
        "-j",
        "-p",
      );
      expect(jsonPrettyShortResult.stderr.raw).toBeEmpty();
      expect(jsonPrettyShortResult.exitCode).toBe(0);
      assertOutputMatches(
        jsonPrettyShortResult.stdout.raw,
        JSON.stringify(
          {
            name: "all-workspaces",
            workspaces: [
              "application-1a",
              "application-1b",
              "library-1a",
              "library-1b",
            ],
          },
          null,
          2,
        ),
      );

      const doesNotExistResult = await run(command, "does-not-exist");
      expect(doesNotExistResult.stdout.raw).toBeEmpty();
      expect(doesNotExistResult.exitCode).toBe(1);
      assertOutputMatches(
        doesNotExistResult.stderr.sanitized,
        'Script not found: "does-not-exist"',
      );
    },
  );

  test.each(listCommandAndAliases("runScript"))(
    "Run Script (basic): %s",
    async (command) => {
      const { run } = setupCliTest({});

      const deprecated_appAResult = await run(command, "application-a");
      expect(deprecated_appAResult.exitCode).toBe(0);
      assertOutputMatches(
        deprecated_appAResult.stdout.sanitizedCompactLines,
        `[application-a:application-a] script for application-a
✅ application-a: application-a
1 script ran successfully`,
      );

      const aWorkspacesResult = await run(command, "a-workspaces");
      expect(aWorkspacesResult.exitCode).toBe(0);
      assertOutputMatches(
        aWorkspacesResult.stdout.sanitizedCompactLines,
        `[application-a:a-workspaces] script for a workspaces
[library-a:a-workspaces] script for a workspaces
✅ application-a: a-workspaces
✅ library-a: a-workspaces
2 scripts ran successfully`,
      );

      const aWorkspacesLibraryResult = await run(
        command,
        "a-workspaces",
        "library-a",
      );
      expect(aWorkspacesLibraryResult.exitCode).toBe(0);
      assertOutputMatches(
        aWorkspacesLibraryResult.stdout.sanitizedCompactLines,
        `[library-a:a-workspaces] script for a workspaces
✅ library-a: a-workspaces
1 script ran successfully`,
      );

      const allWorkspacesResult = await run(command, "all-workspaces");
      expect(allWorkspacesResult.exitCode).toBe(0);
      assertOutputMatches(
        allWorkspacesResult.stdout.sanitizedCompactLines,
        `[application-a:all-workspaces] script for all workspaces
[application-b:all-workspaces] script for all workspaces
[library-a:all-workspaces] script for all workspaces
[library-b:all-workspaces] script for all workspaces
[library-c:all-workspaces] script for all workspaces
✅ application-a: all-workspaces
✅ application-b: all-workspaces
✅ library-a: all-workspaces
✅ library-b: all-workspaces
✅ library-c: all-workspaces
5 scripts ran successfully`,
      );

      const noScriptResult = await run(command, "no-script");
      assertOutputMatches(
        noScriptResult.stderr.sanitizedCompactLines,
        `No matching workspaces found with script "no-script"`,
      );

      const noWorkspacesResult = await run(
        command,
        "application-a",
        "does-not-exist",
      );
      assertOutputMatches(
        noWorkspacesResult.stderr.sanitizedCompactLines,
        `Workspace name or alias not found: "does-not-exist"`,
      );

      const noWorkspaceScriptResult = await run(
        command,
        "does-not-exist",
        "application-a",
      );
      assertOutputMatches(
        noWorkspaceScriptResult.stderr.sanitizedCompactLines,
        `No matching workspaces found with script "does-not-exist"`,
      );
    },
  );

  test("Project command exits with error if invalid project is provided", async () => {
    const { run } = setupCliTest({
      testProject: "invalidBadJson",
    });

    const result = await run("ls");
    expect(result.exitCode).toBe(1);
    assertOutputMatches(
      result.stderr.sanitizedCompactLines,
      `No bun.lock found at ${withWindowsPath(getProjectRoot("invalidBadJson"))}. Check that this is the directory of your project and that you've ran 'bun install'. ` +
        "If you have ran 'bun install', you may simply have no workspaces or dependencies in your project.",
    );
  });
});
