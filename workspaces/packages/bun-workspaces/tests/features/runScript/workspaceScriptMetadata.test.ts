import path from "path";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { BunWorkspacesError, createFileSystemProject } from "../../../src";
import { getWorkspaceScriptMetadata } from "../../../src/runScript/workspaceScriptMetadata";
import { getProjectRoot } from "../../fixtures/testProjects";
import { withWindowsPath } from "../../util/windows";

const METADATA_KEYS = [
  { key: "projectPath", envVar: "BW_PROJECT_PATH" },
  { key: "projectName", envVar: "BW_PROJECT_NAME" },
  { key: "workspacePath", envVar: "BW_WORKSPACE_PATH" },
  { key: "workspaceRelativePath", envVar: "BW_WORKSPACE_RELATIVE_PATH" },
  { key: "workspaceName", envVar: "BW_WORKSPACE_NAME" },
  { key: "scriptName", envVar: "BW_SCRIPT_NAME" },
] as const;

describe("getWorkspaceScriptMetadata", () => {
  const originalValues: Partial<Record<string, string>> = {};

  beforeEach(() => {
    for (const { envVar } of METADATA_KEYS) {
      originalValues[envVar] = process.env[envVar];
      delete process.env[envVar];
    }
  });

  afterEach(() => {
    for (const { envVar } of METADATA_KEYS) {
      const original = originalValues[envVar];
      if (original === undefined) {
        delete process.env[envVar];
      } else {
        process.env[envVar] = original;
      }
    }
  });

  describe("returns env var value when set", () => {
    for (const { key, envVar } of METADATA_KEYS) {
      test(key, () => {
        const testValue = `test-value-for-${key}`;
        process.env[envVar] = testValue;
        expect(getWorkspaceScriptMetadata(key)).toBe(testValue);
      });
    }
  });

  describe("throws BunWorkspacesError when env var is not set", () => {
    for (const { key, envVar } of METADATA_KEYS) {
      test(key, () => {
        expect(() => getWorkspaceScriptMetadata(key)).toThrow(
          BunWorkspacesError,
        );
        expect(() => getWorkspaceScriptMetadata(key)).toThrow(envVar);
        expect(() => getWorkspaceScriptMetadata(key)).toThrow(key);
      });
    }
  });
});

describe("getWorkspaceScriptMetadata (integration)", () => {
  const projectRoot = getProjectRoot("runScriptWithScriptMetadataApi");

  test("returns real metadata values from a script running via bw", async () => {
    const project = createFileSystemProject({ rootDirectory: projectRoot });
    const { output, exit } = project.runWorkspaceScript({
      workspaceNameOrAlias: "workspace-a",
      script: "get-metadata",
    });

    let stdout = "";
    for await (const { chunk, metadata } of output.text()) {
      if (metadata.streamName === "stdout") stdout += chunk;
    }
    await exit;

    const result = JSON.parse(stdout.trim());

    expect(result.projectPath).toBe(projectRoot);
    expect(result.projectName).toBe("test-root");
    expect(result.workspacePath).toBe(
      withWindowsPath(path.join(projectRoot, "packages/workspace-a")),
    );
    expect(result.workspaceRelativePath).toBe(
      withWindowsPath("packages/workspace-a"),
    );
    expect(result.workspaceName).toBe("workspace-a");
    expect(result.scriptName).toBe("get-metadata");
  });
});
