import { test, expect, describe } from "bun:test";
import {
  setupCliTest,
  assertOutputMatches,
  listCommandAndAliases,
} from "../../util/cliTestUtils";

describe("Script Info", () => {
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

      const expectedAllWorkspacesJson = {
        name: "all-workspaces",
        workspaces: [
          "application-1a",
          "application-1b",
          "library-1a",
          "library-1b",
        ],
      };

      const jsonResult = await run(command, "all-workspaces", "--json");
      expect(jsonResult.stderr.raw).toBeEmpty();
      expect(jsonResult.exitCode).toBe(0);
      assertOutputMatches(
        jsonResult.stdout.raw,
        JSON.stringify(expectedAllWorkspacesJson),
      );

      const jsonShortResult = await run(command, "all-workspaces", "-j");
      expect(jsonShortResult.stderr.raw).toBeEmpty();
      expect(jsonShortResult.exitCode).toBe(0);
      assertOutputMatches(
        jsonShortResult.stdout.raw,
        JSON.stringify(expectedAllWorkspacesJson),
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
        JSON.stringify(expectedAllWorkspacesJson, null, 2),
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
        JSON.stringify(expectedAllWorkspacesJson, null, 2),
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
});
