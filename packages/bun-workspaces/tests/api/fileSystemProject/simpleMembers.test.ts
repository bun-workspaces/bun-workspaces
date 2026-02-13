import path from "path";
import { expect, test, describe } from "bun:test";
import { getUserEnvVarName } from "../../../src/config/userEnvVars";
import { BUN_LOCK_ERRORS } from "../../../src/internal/bun";
import { createFileSystemProject } from "../../../src/project";
import { getProjectRoot } from "../../fixtures/testProjects";
import { withWindowsPath } from "../../util/windows";

describe("Test FileSystemProject", () => {
  test("createFileSystemProject: root directory defaults to process.cwd()", async () => {
    if (process.env.IS_BUILD === "true") {
      expect(createFileSystemProject().rootDirectory).toBe(
        withWindowsPath(process.cwd()),
      );
    } else {
      expect(() => createFileSystemProject()).toThrow(
        BUN_LOCK_ERRORS.BunLockNotFound,
      );
      expect(() => createFileSystemProject()).toThrow(
        `No bun.lock found at ${withWindowsPath(process.cwd())}.`,
      );
    }
  });

  test("createFileSystemProject: root directory is relative to process.cwd()  ", async () => {
    if (process.env.IS_BUILD === "true") {
      const project = createFileSystemProject({
        rootDirectory: "../../../",
      });
      expect(project.rootDirectory).toBe(
        withWindowsPath(path.resolve(process.cwd(), "../../..")),
      );
    } else {
      const project = createFileSystemProject({
        rootDirectory: "../..",
      });
      expect(project.rootDirectory).toBe(
        withWindowsPath(path.resolve(process.cwd(), "../..")),
      );
    }
  });

  test("Inline script env var metadata", async () => {
    const project = createFileSystemProject({
      rootDirectory: getProjectRoot("default"),
    });

    const singleResult = project.runWorkspaceScript({
      workspaceNameOrAlias: "application-a",
      script: "bun run <projectPath>/../testScriptMetadataEnv.ts",
      inline: { scriptName: "test-script-metadata-env" },
    });

    let output = "";
    for await (const chunk of singleResult.output) {
      output += chunk.decode();
    }

    expect(output).toBe(`${project.rootDirectory}
test-root
application-a
${project.rootDirectory}${withWindowsPath("/applications/applicationA")}
${withWindowsPath("applications/applicationA")}
test-script-metadata-env
`);

    const multiResult = project.runScriptAcrossWorkspaces({
      workspacePatterns: ["application-b"],
      script: "bun run <projectPath>/../testScriptMetadataEnv.ts",
      inline: { scriptName: "test-script-metadata-env-b" },
    });

    output = "";
    for await (const { outputChunk: chunk } of multiResult.output) {
      output += chunk.decode();
    }
    expect(output).toBe(`${project.rootDirectory}
test-root
application-b
${project.rootDirectory}${withWindowsPath("/applications/applicationB")}
${withWindowsPath("applications/applicationB")}
test-script-metadata-env-b
`);
  });

  test("Include root workspace - explicit", () => {
    const projectExclude = createFileSystemProject({
      rootDirectory: getProjectRoot("withRootWorkspace"),
    });

    expect(
      projectExclude.workspaces.find((w) =>
        Bun.deepEquals(w, projectExclude.rootWorkspace),
      ),
    ).toBeFalsy();

    const projectInclude = createFileSystemProject({
      rootDirectory: getProjectRoot("withRootWorkspace"),
      includeRootWorkspace: true,
    });

    expect(projectInclude.rootWorkspace).toEqual(projectInclude.workspaces[0]);
  });

  test("Include root workspace - env var", () => {
    process.env[getUserEnvVarName("includeRootWorkspaceDefault")] = "false";

    const projectExclude = createFileSystemProject({
      rootDirectory: getProjectRoot("withRootWorkspace"),
    });

    expect(
      projectExclude.workspaces.find((w) =>
        Bun.deepEquals(w, projectExclude.rootWorkspace),
      ),
    ).toBeFalsy();

    process.env[getUserEnvVarName("includeRootWorkspaceDefault")] = "true";

    const projectInclude = createFileSystemProject({
      rootDirectory: getProjectRoot("withRootWorkspace"),
    });

    expect(projectInclude.rootWorkspace).toEqual(projectInclude.workspaces[0]);

    const projectExcludeOverride = createFileSystemProject({
      rootDirectory: getProjectRoot("withRootWorkspace"),
      includeRootWorkspace: false,
    });

    expect(
      projectExcludeOverride.workspaces.find((w) =>
        Bun.deepEquals(w, projectExcludeOverride.rootWorkspace),
      ),
    ).toBeFalsy();

    delete process.env[getUserEnvVarName("includeRootWorkspaceDefault")];
  });

  test("Include root workspace - config file", () => {
    const project = createFileSystemProject({
      rootDirectory: getProjectRoot("withRootWorkspaceWithConfigFiles"),
    });

    expect(project.rootWorkspace).toEqual(project.workspaces[0]);

    process.env[getUserEnvVarName("includeRootWorkspaceDefault")] = "false";

    const projectNotOverridden = createFileSystemProject({
      rootDirectory: getProjectRoot("withRootWorkspaceWithConfigFiles"),
    });

    expect(projectNotOverridden.rootWorkspace).toEqual(
      projectNotOverridden.workspaces[0],
    );

    const projectOverridden = createFileSystemProject({
      rootDirectory: getProjectRoot("withRootWorkspaceWithConfigFiles"),
      includeRootWorkspace: false,
    });

    expect(
      projectOverridden.workspaces.find((w) =>
        Bun.deepEquals(w, projectOverridden.rootWorkspace),
      ),
    ).toBeFalsy();

    delete process.env[getUserEnvVarName("includeRootWorkspaceDefault")];
  });
});
