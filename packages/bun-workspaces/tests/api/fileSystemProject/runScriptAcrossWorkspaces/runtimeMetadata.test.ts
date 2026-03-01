import { expect, test, describe } from "bun:test";
import { createFileSystemProject } from "../../../../src/project";
import { getProjectRoot } from "../../../fixtures/testProjects";
import { withWindowsPath } from "../../../util/windows";

describe("FileSystemProject runScriptAcrossWorkspaces", () => {
  test("runtime metadata", async () => {
    const project = createFileSystemProject({
      rootDirectory: getProjectRoot("runScriptWithRuntimeMetadataDebug"),
    });

    const plainResult = project.runScriptAcrossWorkspaces({
      workspacePatterns: ["application-*"],
      script: "test-echo",
    });

    let i = 0;
    for await (const { metadata, chunk } of plainResult.output.text()) {
      const appLetter = i === 0 ? "a" : "b";
      expect(metadata.streamName).toBe("stdout");
      expect(chunk.trim()).toBe(
        `${project.rootDirectory} test-root application-${appLetter} ${project.rootDirectory}${withWindowsPath(`/applications/application-${appLetter}`)} ${withWindowsPath(`applications/application-${appLetter}`)} test-echo`,
      );
      i++;
    }

    const argsResult = project.runScriptAcrossWorkspaces({
      workspacePatterns: ["application-*"],
      script: "test-echo",
      args: "--arg1=<projectPath> --arg2=<projectName> --arg3=<workspaceName> --arg4=<workspacePath> --arg5=<workspaceRelativePath> --arg6=<scriptName>",
    });

    let j = 0;
    for await (const { metadata, chunk } of argsResult.output.text()) {
      const appLetter = j === 0 ? "a" : "b";
      expect(metadata.streamName).toBe("stdout");
      expect(chunk.trim()).toBe(
        `${project.rootDirectory} test-root application-${appLetter} ${project.rootDirectory}${withWindowsPath(`/applications/application-${appLetter}`)} ${withWindowsPath(`applications/application-${appLetter}`)} test-echo --arg1=${project.rootDirectory} --arg2=test-root --arg3=application-${appLetter} --arg4=${project.rootDirectory}${withWindowsPath(`/applications/application-${appLetter}`)} --arg5=${withWindowsPath(`applications/application-${appLetter}`)} --arg6=test-echo`,
      );
      j++;
    }
  });

  test("runtime metadata (inline)", async () => {
    const project = createFileSystemProject({
      rootDirectory: getProjectRoot("runScriptWithRuntimeMetadataDebug"),
    });

    const anonymousScriptResult = project.runScriptAcrossWorkspaces({
      workspacePatterns: ["application-*"],
      script:
        "echo <projectPath> <workspaceName> <workspacePath> <workspaceRelativePath> <scriptName>",
      inline: true,
    });

    let k = 0;
    for await (const {
      metadata,
      chunk,
    } of anonymousScriptResult.output.text()) {
      const appLetter = k === 0 ? "a" : "b";
      expect(metadata.streamName).toBe("stdout");
      expect(chunk.trim()).toBe(
        `${project.rootDirectory} application-${appLetter} ${project.rootDirectory}${withWindowsPath(`/applications/application-${appLetter}`)} ${withWindowsPath(`applications/application-${appLetter}`)}`,
      );
      k++;
    }

    const namedScriptResult = project.runScriptAcrossWorkspaces({
      workspacePatterns: ["application-*"],
      script:
        "echo <projectPath> <workspaceName> <workspacePath> <workspaceRelativePath> <scriptName>",
      inline: { scriptName: "my-named-script" },
    });

    let l = 0;
    for await (const { metadata, chunk } of namedScriptResult.output.text()) {
      const appLetter = l === 0 ? "a" : "b";
      expect(metadata.streamName).toBe("stdout");
      expect(chunk.trim()).toBe(
        `${project.rootDirectory} application-${appLetter} ${project.rootDirectory}${withWindowsPath(`/applications/application-${appLetter}`)} ${withWindowsPath(`applications/application-${appLetter}`)} my-named-script`,
      );
      l++;
    }
  });
});
