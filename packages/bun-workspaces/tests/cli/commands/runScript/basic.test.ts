import { test, expect, describe } from "bun:test";
import {
  getCliCommandConfig,
  type CliCommandName,
} from "../../../../src/cli/commands";
import { getProjectRoot } from "../../../fixtures/testProjects";
import { setupCliTest, assertOutputMatches } from "../../../util/cliTestUtils";
import { withWindowsPath } from "../../../util/windows";

const listCommandAndAliases = (commandName: CliCommandName) => {
  const config = getCliCommandConfig(commandName);
  return [config.command.split(/\s+/)[0], ...config.aliases];
};

describe("CLI Run Script (basic)", () => {
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
});
