import { test, expect, describe } from "bun:test";
import {
  setupCliTest,
  assertOutputMatches,
  listCommandAndAliases,
} from "../../util/cliTestUtils";
import { withWindowsPath } from "../../util/windows";

describe("Workspace Info", () => {
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

      const expectedWorkspaceJson = {
        name: "application-1a",
        isRoot: false,
        matchPattern: "applications/*",
        path: withWindowsPath("applications/applicationA"),
        scripts: ["a-workspaces", "all-workspaces", "application-a"],
        aliases: ["deprecated_appA"],
        dependencies: [],
        dependents: [],
      };

      const jsonResult = await run(command, "application-1a", "--json");
      expect(jsonResult.stderr.raw).toBeEmpty();
      expect(jsonResult.exitCode).toBe(0);
      assertOutputMatches(
        jsonResult.stdout.raw,
        JSON.stringify(expectedWorkspaceJson),
      );

      const jsonShortResult = await run(command, "application-1a", "-j");
      expect(jsonShortResult.stderr.raw).toBeEmpty();
      expect(jsonShortResult.exitCode).toBe(0);
      assertOutputMatches(
        jsonShortResult.stdout.raw,
        JSON.stringify(expectedWorkspaceJson),
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
        JSON.stringify(expectedWorkspaceJson, null, 2),
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
        JSON.stringify(expectedWorkspaceJson, null, 2),
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
});
