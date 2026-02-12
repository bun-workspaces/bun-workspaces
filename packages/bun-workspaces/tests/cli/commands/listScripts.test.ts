import { test, expect, describe } from "bun:test";
import { getProjectRoot } from "../../fixtures/testProjects";
import {
  setupCliTest,
  assertOutputMatches,
  listCommandAndAliases,
} from "../../util/cliTestUtils";
import { withWindowsPath } from "../../util/windows";

describe("List Scripts", () => {
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
});
