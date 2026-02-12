import path from "node:path";
import { describe, expect, test } from "bun:test";
import { createFileSystemProject } from "../src";
import { getProjectRoot } from "./fixtures/testProjects";
import { setupCliTest } from "./util/cliTestUtils";

describe("Test root selector", () => {
  describe("API", () => {
    test("findWorkspacesByPattern selects root when not included", () => {
      const projectNoRoot = createFileSystemProject({
        rootDirectory: getProjectRoot("withRootWorkspace"),
        includeRootWorkspace: false,
      });

      expect(projectNoRoot.findWorkspacesByPattern("@root")).toEqual([
        projectNoRoot.rootWorkspace,
      ]);
    });

    test("findWorkspacesByPattern combines root with other patterns", () => {
      const projectNoRoot = createFileSystemProject({
        rootDirectory: getProjectRoot("withRootWorkspace"),
        includeRootWorkspace: false,
      });

      expect(
        projectNoRoot.findWorkspacesByPattern("application-*", "@root"),
      ).toEqual([
        projectNoRoot.rootWorkspace,
        projectNoRoot.findWorkspaceByName("application-1a")!,
        projectNoRoot.findWorkspaceByName("application-1b")!,
      ]);
    });

    test("findWorkspacesByPattern selects root when included", () => {
      const projectWithRoot = createFileSystemProject({
        rootDirectory: getProjectRoot("withRootWorkspace"),
        includeRootWorkspace: true,
      });

      expect(projectWithRoot.findWorkspacesByPattern("@root")).toEqual([
        projectWithRoot.rootWorkspace,
      ]);
    });

    test("createScriptCommand resolves @root", () => {
      const project = createFileSystemProject({
        rootDirectory: getProjectRoot("withRootWorkspace"),
      });

      expect(
        project.createScriptCommand({
          workspaceNameOrAlias: "@root",
          scriptName: "root-workspace",
        }),
      ).toEqual({
        commandDetails: {
          workingDirectory: path.resolve(project.rootDirectory),
          command: "bun --silent run root-workspace",
        },
        scriptName: "root-workspace",
        workspace: project.rootWorkspace,
      });
    });
  });

  describe("CLI", () => {
    test("workspace-info shows root workspace", async () => {
      const { run } = setupCliTest({
        testProject: "withRootWorkspace",
      });

      const result = await run("--no-include-root", "workspace-info", "@root");
      expect(result.exitCode).toBe(0);
      expect(result.stdout.raw).toContain(
        `Workspace: test-root (root)
 - Aliases: my-root-alias
 - Path: 
 - Glob Match: 
 - Scripts: all-workspaces, root-workspace`,
      );
    });

    test("run-script runs on root workspace", async () => {
      const { run } = setupCliTest({
        testProject: "withRootWorkspace",
      });

      const result = await run(
        "--no-include-root",
        "run-script",
        "root-workspace",
        "@root",
      );
      expect(result.exitCode).toBe(0);
      expect(result.stdout.sanitizedCompactLines).toContain(
        `[test-root:root-workspace] script for root workspace
✅ test-root: root-workspace
1 script ran successfully`,
      );
    });
  });
});
