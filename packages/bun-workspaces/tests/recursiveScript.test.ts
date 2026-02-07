import { describe, test, expect } from "bun:test";
import { createFileSystemProject } from "../src";
import { getProjectRoot } from "./testProjects";

describe("Recursive Script", () => {
  test("Recursive scripts are detected and prevented", async () => {
    const project = createFileSystemProject({
      rootDirectory: getProjectRoot("recursiveScript"),
    });

    const runPackageA = project.runWorkspaceScript({
      workspaceNameOrAlias: "package-a",
      script: "test-script",
    });

    const errorMessage = `Script "test-script" recursively calls itself in workspace "package-a"`;

    for await (const chunk of runPackageA.output) {
      expect(chunk.streamName).toBe("stderr");
      expect(chunk.decode().trim()).toMatch(errorMessage);
    }

    expect((await runPackageA.exit).exitCode).toBe(1);

    const runPackages = project.runScriptAcrossWorkspaces({
      script: "test-script",
    });

    for await (const { outputChunk, scriptMetadata } of runPackages.output) {
      if (scriptMetadata.workspace.name === "package-a") {
        expect(outputChunk.streamName).toBe("stderr");
        expect(outputChunk.decode().trim()).toMatch(errorMessage);
      } else {
        expect(outputChunk.streamName).toBe("stdout");
        expect(outputChunk.decode().trim()).toMatch("hello from package-b");
      }
    }

    expect((await runPackages.summary).allSuccess).toBe(false);
  });
});
