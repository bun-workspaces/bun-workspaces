import { expect, test, describe } from "bun:test";
import { createFileSystemProject, PROJECT_ERRORS } from "../../../src/project";
import { getProjectRoot } from "../../fixtures/testProjects";
import { makeTestWorkspace } from "../../util/testData";
import { withWindowsPath } from "../../util/windows";

describe("FileSystemProject runWorkspaceScript", () => {
  test("simple success", async () => {
    const project = createFileSystemProject({
      rootDirectory: getProjectRoot("default"),
    });

    const { output, exit } = project.runWorkspaceScript({
      workspaceNameOrAlias: "application-a",
      script: "a-workspaces",
    });

    for await (const chunk of output) {
      expect(chunk.decode().trim()).toMatch("script for a workspaces");
      expect(chunk.decode({ stripAnsi: true }).trim()).toMatch(
        "script for a workspaces",
      );
      expect(chunk.streamName).toBe("stdout");
    }

    const exitResult = await exit;

    expect(exitResult).toEqual({
      exitCode: 0,
      success: true,
      startTimeISO: expect.any(String),
      endTimeISO: expect.any(String),
      durationMs: expect.any(Number),
      signal: null,
      metadata: {
        workspace: makeTestWorkspace({
          name: "application-a",
          path: "applications/applicationA",
          matchPattern: "applications/*",
          scripts: ["a-workspaces", "all-workspaces", "application-a"],
        }),
      },
    });
  });

  test("using workspace alias", async () => {
    const project = createFileSystemProject({
      rootDirectory: getProjectRoot("workspaceConfigPackageOnly"),
    });

    const { output, exit } = project.runWorkspaceScript({
      workspaceNameOrAlias: "appA",
      script: "a-workspaces",
    });

    for await (const chunk of output) {
      expect(chunk.decode().trim()).toMatch("script for a workspaces");
      expect(chunk.decode({ stripAnsi: true }).trim()).toMatch(
        "script for a workspaces",
      );
      expect(chunk.streamName).toBe("stdout");
    }

    const exitResult = await exit;

    expect(exitResult).toEqual({
      exitCode: 0,
      success: true,
      startTimeISO: expect.any(String),
      endTimeISO: expect.any(String),
      durationMs: expect.any(Number),
      signal: null,
      metadata: {
        workspace: makeTestWorkspace({
          name: "application-1a",
          path: "applications/application-a",
          matchPattern: "applications/*",
          scripts: ["a-workspaces", "all-workspaces", "application-a"],
          aliases: ["appA"],
        }),
      },
    });
  });

  test("invalid workspace", async () => {
    const project = createFileSystemProject({
      rootDirectory: getProjectRoot("default"),
    });

    try {
      project.runWorkspaceScript({
        workspaceNameOrAlias: "invalid-workspace",
        script: "a-workspaces",
      });
    } catch (error) {
      expect(error).toBeInstanceOf(PROJECT_ERRORS.ProjectWorkspaceNotFound);
    }
  });

  test("expected output", async () => {
    const project = createFileSystemProject({
      rootDirectory: getProjectRoot("runScriptWithMixedOutput"),
    });

    const { output, exit } = project.runWorkspaceScript({
      workspaceNameOrAlias: "fail1",
      script: "test-exit",
    });

    const expectedOutput = [
      {
        text: "fail1 stdout 1",
        textNoAnsi: "fail1 stdout 1",
        streamName: "stdout",
      },
      {
        text: "fail1 stderr 1",
        textNoAnsi: "fail1 stderr 1",
        streamName: "stderr",
      },
      {
        text: "fail1 stdout 2",
        textNoAnsi: "fail1 stdout 2",
        streamName: "stdout",
      },
    ] as const;

    let i = 0;
    for await (const chunk of output) {
      const expected = expectedOutput[i];
      expect(chunk.decode().trim()).toMatch(expected.text);
      expect(chunk.decode({ stripAnsi: true }).trim()).toMatch(
        expected.textNoAnsi,
      );
      expect(chunk.streamName).toBe(expected.streamName);
      i++;
    }

    const exitResult = await exit;
    expect(exitResult).toEqual({
      exitCode: 1,
      success: false,
      startTimeISO: expect.any(String),
      endTimeISO: expect.any(String),
      durationMs: expect.any(Number),
      signal: null,
      metadata: {
        workspace: makeTestWorkspace({
          name: "fail1",
          path: "packages/fail1",
          matchPattern: "packages/**/*",
          scripts: ["test-exit"],
        }),
      },
    });
  });

  test("runtime metadata", async () => {
    const project = createFileSystemProject({
      rootDirectory: getProjectRoot("runScriptWithRuntimeMetadataDebug"),
    });

    const plainResult = project.runWorkspaceScript({
      workspaceNameOrAlias: "application-a",
      script: "test-echo",
    });

    for await (const chunk of plainResult.output) {
      expect(chunk.decode().trim()).toBe(
        `${project.rootDirectory} test-root application-a ${project.rootDirectory}${withWindowsPath("/applications/application-a")} ${withWindowsPath("applications/application-a")} test-echo`,
      );
      expect(chunk.decode({ stripAnsi: true }).trim()).toBe(
        `${project.rootDirectory} test-root application-a ${project.rootDirectory}${withWindowsPath("/applications/application-a")} ${withWindowsPath("applications/application-a")} test-echo`,
      );
      expect(chunk.streamName).toBe("stdout");
    }

    const argsResult = project.runWorkspaceScript({
      workspaceNameOrAlias: "application-a",
      script: "test-echo",
      args: "--arg1=<projectPath> --arg2=<projectName> --arg3=<workspaceName> --arg4=<workspacePath> --arg5=<workspaceRelativePath> --arg6=<scriptName>",
    });

    for await (const chunk of argsResult.output) {
      expect(chunk.decode().trim()).toBe(
        `${project.rootDirectory} test-root application-a ${project.rootDirectory}${withWindowsPath("/applications/application-a")} ${withWindowsPath("applications/application-a")} test-echo --arg1=${project.rootDirectory} --arg2=test-root --arg3=application-a --arg4=${project.rootDirectory}${withWindowsPath("/applications/application-a")} --arg5=${withWindowsPath("applications/application-a")} --arg6=test-echo`,
      );
      expect(chunk.decode({ stripAnsi: true }).trim()).toBe(
        `${project.rootDirectory} test-root application-a ${project.rootDirectory}${withWindowsPath("/applications/application-a")} ${withWindowsPath("applications/application-a")} test-echo --arg1=${project.rootDirectory} --arg2=test-root --arg3=application-a --arg4=${project.rootDirectory}${withWindowsPath("/applications/application-a")} --arg5=${withWindowsPath("applications/application-a")} --arg6=test-echo`,
      );
      expect(chunk.streamName).toBe("stdout");
    }
  });

  test("runtime metadata (inline)", async () => {
    const project = createFileSystemProject({
      rootDirectory: getProjectRoot("runScriptWithRuntimeMetadataDebug"),
    });

    const anonymousScriptResult = project.runWorkspaceScript({
      workspaceNameOrAlias: "application-a",
      script:
        "echo <projectPath> <projectName> <workspaceName> <workspacePath> <workspaceRelativePath> <scriptName>",
      inline: true,
    });

    for await (const chunk of anonymousScriptResult.output) {
      expect(chunk.decode().trim()).toBe(
        `${project.rootDirectory} test-root application-a ${project.rootDirectory}${withWindowsPath("/applications/application-a")} ${withWindowsPath("applications/application-a")}`,
      );
      expect(chunk.decode({ stripAnsi: true }).trim()).toBe(
        `${project.rootDirectory} test-root application-a ${project.rootDirectory}${withWindowsPath("/applications/application-a")} ${withWindowsPath("applications/application-a")}`,
      );
      expect(chunk.streamName).toBe("stdout");
    }

    const namedScriptResult = project.runWorkspaceScript({
      workspaceNameOrAlias: "application-a",
      script:
        "echo <projectPath> <projectName> <workspaceName> <workspacePath> <workspaceRelativePath> <scriptName>",
      inline: { scriptName: "my-named-script" },
    });

    for await (const chunk of namedScriptResult.output) {
      expect(chunk.decode().trim()).toBe(
        `${project.rootDirectory} test-root application-a ${project.rootDirectory}${withWindowsPath("/applications/application-a")} ${withWindowsPath("applications/application-a")} my-named-script`,
      );
      expect(chunk.decode({ stripAnsi: true }).trim()).toBe(
        `${project.rootDirectory} test-root application-a ${project.rootDirectory}${withWindowsPath("/applications/application-a")} ${withWindowsPath("applications/application-a")} my-named-script`,
      );
      expect(chunk.streamName).toBe("stdout");
    }
  });
});
