import { InvalidJSTypeError } from "../../../src/internal/core";
import { createFileSystemProject, PROJECT_ERRORS } from "../../../src/project";
import { getProjectRoot } from "../../fixtures/testProjects";
import { describe, expect, test } from "../../util/testFramework";

const makeProject = (name: Parameters<typeof getProjectRoot>[0] = "default") =>
  createFileSystemProject({ rootDirectory: getProjectRoot(name) });

describe("FileSystemProject runWorkspaceScript (interactive) - validation", () => {
  test("throws for non-string workspaceNameOrAlias", () => {
    const project = makeProject();
    expect(() =>
      project.runWorkspaceScript({
        workspaceNameOrAlias: 123 as unknown as string,
        script: "a-workspaces",
        interactive: true,
      }),
    ).toThrow(InvalidJSTypeError);
  });

  test("throws for non-string args", () => {
    const project = makeProject();
    expect(() =>
      project.runWorkspaceScript({
        workspaceNameOrAlias: "application-a",
        script: "a-workspaces",
        args: 123 as unknown as string,
        interactive: true,
      }),
    ).toThrow(InvalidJSTypeError);
  });

  test("throws ProjectWorkspaceNotFound for unknown workspace", () => {
    const project = makeProject();
    expect(() =>
      project.runWorkspaceScript({
        workspaceNameOrAlias: "invalid-workspace",
        script: "a-workspaces",
        interactive: true,
      }),
    ).toThrow(PROJECT_ERRORS.ProjectWorkspaceNotFound);
  });

  test("throws WorkspaceScriptDoesNotExist when script is missing", () => {
    const project = makeProject();
    expect(() =>
      project.runWorkspaceScript({
        workspaceNameOrAlias: "application-a",
        script: "not-a-real-script",
        interactive: true,
      }),
    ).toThrow(PROJECT_ERRORS.WorkspaceScriptDoesNotExist);
  });
});

describe("FileSystemProject runWorkspaceScript (interactive)", () => {
  test("returns only an exit promise (no captured output stream)", () => {
    const project = makeProject();
    const result = project.runWorkspaceScript({
      workspaceNameOrAlias: "application-a",
      script: "true",
      inline: true,
      interactive: true,
    });
    expect("output" in result).toBe(false);
    expect(result.exit).toBeInstanceOf(Promise);
  });

  test("inline command succeeds with exit code 0", async () => {
    const project = makeProject();
    const { exit } = project.runWorkspaceScript({
      workspaceNameOrAlias: "application-a",
      script: "exit 0",
      inline: true,
      interactive: true,
    });
    const result = await exit;
    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.metadata.workspace.name).toBe("application-a");
  });

  test("propagates a non-zero exit code", async () => {
    const project = makeProject();
    const { exit } = project.runWorkspaceScript({
      workspaceNameOrAlias: "application-a",
      script: "exit 7",
      inline: true,
      interactive: true,
    });
    const result = await exit;
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(7);
  });

  test("runs a named package.json script", async () => {
    const project = makeProject();
    const { exit } = project.runWorkspaceScript({
      workspaceNameOrAlias: "application-a",
      script: "a-workspaces",
      interactive: true,
    });
    const result = await exit;
    expect(result.success).toBe(true);
    expect(result.metadata.workspace.name).toBe("application-a");
  });

  test("resolves the workspace by alias", async () => {
    const project = makeProject("workspaceConfigPackageOnly");
    const { exit } = project.runWorkspaceScript({
      workspaceNameOrAlias: "appA",
      script: "a-workspaces",
      interactive: true,
    });
    const result = await exit;
    expect(result.success).toBe(true);
    expect(result.metadata.workspace.name).toBe("application-1a");
  });
});
