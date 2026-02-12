import { test, expect, describe } from "bun:test";
import { getProjectRoot } from "../../fixtures/testProjects";
import {
  setupCliTest,
  assertOutputMatches,
  listCommandAndAliases,
} from "../../util/cliTestUtils";
import { withWindowsPath } from "../../util/windows";

describe("List Workspaces", () => {
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
});
