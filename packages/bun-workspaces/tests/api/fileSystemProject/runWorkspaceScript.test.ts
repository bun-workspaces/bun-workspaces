import { expect, test, describe } from "bun:test";
import {
  createFileSystemProject,
  PROJECT_ERRORS,
  type RunWorkspaceScriptExit,
} from "../../../src/project";
import { getProjectRoot } from "../../fixtures/testProjects";
import { makeTestWorkspace } from "../../util/testData";
import { withWindowsPath } from "../../util/windows";

const makeExitResult = (
  overrides: Partial<RunWorkspaceScriptExit>,
): RunWorkspaceScriptExit => ({
  exitCode: 0,
  success: true,
  startTimeISO: expect.any(String),
  endTimeISO: expect.any(String),
  durationMs: expect.any(Number),
  signal: null,
  metadata: {
    workspace: makeTestWorkspace({
      name: "test",
      path: "test",
      matchPattern: "test",
      scripts: ["test"],
    }),
  },
  ...overrides,
});

describe("FileSystemProject runWorkspaceScript", () => {
  test("simple success", async () => {
    const project = createFileSystemProject({
      rootDirectory: getProjectRoot("default"),
    });

    const { output, exit } = project.runWorkspaceScript({
      workspaceNameOrAlias: "application-a",
      script: "a-workspaces",
    });

    for await (const { metadata, chunk } of output.text()) {
      expect(metadata.streamName).toBe("stdout");
      expect(chunk.trim()).toMatch("script for a workspaces");
    }

    const exitResult = await exit;

    expect(exitResult).toEqual(
      makeExitResult({
        metadata: {
          workspace: makeTestWorkspace({
            name: "application-a",
            path: "applications/applicationA",
            matchPattern: "applications/*",
            scripts: ["a-workspaces", "all-workspaces", "application-a"],
          }),
        },
      }),
    );
  });

  test("ignore output", async () => {
    const project = createFileSystemProject({
      rootDirectory: getProjectRoot("default"),
    });

    const { output, exit } = project.runWorkspaceScript({
      workspaceNameOrAlias: "application-a",
      script: "a-workspaces",
      ignoreOutput: true,
    });

    let chunkCount = 0;
    for await (const _chunk of output.text()) {
      chunkCount++;
    }

    expect(chunkCount).toBe(0);

    const exitResult = await exit;

    expect(exitResult).toEqual(
      makeExitResult({
        metadata: {
          workspace: makeTestWorkspace({
            name: "application-a",
            path: "applications/applicationA",
            matchPattern: "applications/*",
            scripts: ["a-workspaces", "all-workspaces", "application-a"],
          }),
        },
      }),
    );
  });

  test("using workspace alias", async () => {
    const project = createFileSystemProject({
      rootDirectory: getProjectRoot("workspaceConfigPackageOnly"),
    });

    const { output, exit } = project.runWorkspaceScript({
      workspaceNameOrAlias: "appA",
      script: "a-workspaces",
    });

    for await (const { metadata, chunk } of output.text()) {
      expect(metadata.streamName).toBe("stdout");
      expect(chunk.trim()).toMatch("script for a workspaces");
    }

    const exitResult = await exit;

    expect(exitResult).toEqual(
      makeExitResult({
        metadata: {
          workspace: makeTestWorkspace({
            name: "application-1a",
            path: "applications/application-a",
            matchPattern: "applications/*",
            scripts: ["a-workspaces", "all-workspaces", "application-a"],
            aliases: ["appA"],
          }),
        },
      }),
    );
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

  test("expected output - deprecated output", async () => {
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
    expect(exitResult).toEqual(
      makeExitResult({
        exitCode: 1,
        success: false,
        metadata: {
          workspace: makeTestWorkspace({
            name: "fail1",
            path: "packages/fail1",
            matchPattern: "packages/**/*",
            scripts: ["test-exit"],
          }),
        },
      }),
    );
  });

  test("expected output - process output (bytes)", async () => {
    const project = createFileSystemProject({
      rootDirectory: getProjectRoot("runScriptWithMixedOutput"),
    });

    const { output, exit } = project.runWorkspaceScript({
      workspaceNameOrAlias: "fail1",
      script: "test-exit",
    });

    const expectedOutput = [
      { text: "fail1 stdout 1", streamName: "stdout" as const },
      { text: "fail1 stderr 1", streamName: "stderr" as const },
      { text: "fail1 stdout 2", streamName: "stdout" as const },
    ];

    let i = 0;
    for await (const { metadata, chunk } of output.bytes()) {
      expect(metadata.streamName).toBe(expectedOutput[i].streamName);
      expect(new TextDecoder().decode(chunk).trim()).toMatch(
        expectedOutput[i].text,
      );
      i++;
    }

    const exitResult = await exit;
    expect(exitResult).toEqual(
      makeExitResult({
        exitCode: 1,
        success: false,
        metadata: {
          workspace: makeTestWorkspace({
            name: "fail1",
            path: "packages/fail1",
            matchPattern: "packages/**/*",
            scripts: ["test-exit"],
          }),
        },
      }),
    );
  });

  test("expected output - process output (text)", async () => {
    const project = createFileSystemProject({
      rootDirectory: getProjectRoot("runScriptWithMixedOutput"),
    });

    const { output, exit } = project.runWorkspaceScript({
      workspaceNameOrAlias: "fail1",
      script: "test-exit",
    });

    const expectedOutput = [
      { text: "fail1 stdout 1", streamName: "stdout" as const },
      { text: "fail1 stderr 1", streamName: "stderr" as const },
      { text: "fail1 stdout 2", streamName: "stdout" as const },
    ];

    let i = 0;
    for await (const { metadata, chunk } of output.text()) {
      expect(metadata.streamName).toBe(expectedOutput[i].streamName);
      expect(chunk.trim()).toMatch(expectedOutput[i].text);
      i++;
    }

    const exitResult = await exit;
    expect(exitResult).toEqual(
      makeExitResult({
        exitCode: 1,
        success: false,
        metadata: {
          workspace: makeTestWorkspace({
            name: "fail1",
            path: "packages/fail1",
            matchPattern: "packages/**/*",
            scripts: ["test-exit"],
          }),
        },
      }),
    );
  });

  test("runtime metadata", async () => {
    const project = createFileSystemProject({
      rootDirectory: getProjectRoot("runScriptWithRuntimeMetadataDebug"),
    });

    const plainResult = project.runWorkspaceScript({
      workspaceNameOrAlias: "application-a",
      script: "test-echo",
    });

    for await (const { metadata, chunk } of plainResult.output.text()) {
      expect(metadata.streamName).toBe("stdout");
      expect(chunk.trim()).toBe(
        `${project.rootDirectory} test-root application-a ${project.rootDirectory}${withWindowsPath("/applications/application-a")} ${withWindowsPath("applications/application-a")} test-echo`,
      );
    }

    const argsResult = project.runWorkspaceScript({
      workspaceNameOrAlias: "application-a",
      script: "test-echo",
      args: "--arg1=<projectPath> --arg2=<projectName> --arg3=<workspaceName> --arg4=<workspacePath> --arg5=<workspaceRelativePath> --arg6=<scriptName>",
    });

    for await (const { metadata, chunk } of argsResult.output.text()) {
      expect(metadata.streamName).toBe("stdout");
      expect(chunk.trim()).toBe(
        `${project.rootDirectory} test-root application-a ${project.rootDirectory}${withWindowsPath("/applications/application-a")} ${withWindowsPath("applications/application-a")} test-echo --arg1=${project.rootDirectory} --arg2=test-root --arg3=application-a --arg4=${project.rootDirectory}${withWindowsPath("/applications/application-a")} --arg5=${withWindowsPath("applications/application-a")} --arg6=test-echo`,
      );
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

    for await (const {
      metadata,
      chunk,
    } of anonymousScriptResult.output.text()) {
      expect(metadata.streamName).toBe("stdout");
      expect(chunk.trim()).toBe(
        `${project.rootDirectory} test-root application-a ${project.rootDirectory}${withWindowsPath("/applications/application-a")} ${withWindowsPath("applications/application-a")}`,
      );
    }

    const namedScriptResult = project.runWorkspaceScript({
      workspaceNameOrAlias: "application-a",
      script:
        "echo <projectPath> <projectName> <workspaceName> <workspacePath> <workspaceRelativePath> <scriptName>",
      inline: { scriptName: "my-named-script" },
    });

    for await (const { metadata, chunk } of namedScriptResult.output.text()) {
      expect(metadata.streamName).toBe("stdout");
      expect(chunk.trim()).toBe(
        `${project.rootDirectory} test-root application-a ${project.rootDirectory}${withWindowsPath("/applications/application-a")} ${withWindowsPath("applications/application-a")} my-named-script`,
      );
    }
  });
});
