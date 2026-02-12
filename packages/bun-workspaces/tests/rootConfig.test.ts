import { describe, expect, test } from "bun:test";
import { createFileSystemProject } from "../src";
import { loadRootConfig } from "../src/config/rootConfig";
import { determineParallelMax, resolveScriptShell } from "../src/runScript";
import { getProjectRoot } from "./fixtures/testProjects";

describe("Test project root config", () => {
  describe("loadRootConfig", () => {
    test("loads defaults when no config file exists", () => {
      expect(loadRootConfig(getProjectRoot("default"))).toEqual({
        defaults: {
          parallelMax: determineParallelMax("default"),
          shell: resolveScriptShell("default"),
          includeRootWorkspace: false,
        },
      });
    });

    test("loads jsonc config file", () => {
      expect(loadRootConfig(getProjectRoot("rootConfigJsoncFile"))).toEqual({
        defaults: {
          parallelMax: 5,
          shell: "system",
          includeRootWorkspace: true,
        },
      });
    });

    test("loads package.json config", () => {
      expect(loadRootConfig(getProjectRoot("rootConfigPackage"))).toEqual({
        defaults: {
          parallelMax: 5,
          shell: "system",
          includeRootWorkspace: false,
        },
      });
    });

    test("loads config with only parallelMax set", () => {
      expect(
        loadRootConfig(getProjectRoot("rootConfigParallelMaxOnly")),
      ).toEqual({
        defaults: {
          parallelMax: 5,
          shell: resolveScriptShell("default"),
          includeRootWorkspace: false,
        },
      });
    });

    test("throws for invalid parallel max", () => {
      expect(() =>
        loadRootConfig(getProjectRoot("rootConfigInvalidParallel")),
      ).toThrow(
        'Invalid parallel max value: "something wrong" (set by root config)',
      );
    });

    test("throws for invalid shell", () => {
      expect(() =>
        loadRootConfig(getProjectRoot("rootConfigInvalidShell")),
      ).toThrow(
        "Invalid shell option: something wrong (accepted values: bun, system)",
      );
    });

    test("throws for invalid JSON", () => {
      expect(() =>
        loadRootConfig(getProjectRoot("rootConfigInvalidJson")),
      ).toThrow("Invalid JSON");
    });

    test("throws for invalid type", () => {
      expect(() =>
        loadRootConfig(getProjectRoot("rootConfigInvalidType")),
      ).toThrow("Root config is invalid: config.defaults must be object");
    });
  });

  describe("FileSystemProject integration", () => {
    test("loads root config for default project", () => {
      expect(
        createFileSystemProject({
          rootDirectory: getProjectRoot("default"),
        }).config.root,
      ).toEqual({
        defaults: {
          parallelMax: determineParallelMax("default"),
          shell: resolveScriptShell("default"),
          includeRootWorkspace: false,
        },
      });
    });

    test("loads root config for jsonc file project", () => {
      expect(
        createFileSystemProject({
          rootDirectory: getProjectRoot("rootConfigJsoncFile"),
        }).config.root,
      ).toEqual({
        defaults: {
          parallelMax: 5,
          shell: "system",
          includeRootWorkspace: true,
        },
      });
    });

    test("uses parallel max from config", async () => {
      const project = createFileSystemProject({
        rootDirectory: getProjectRoot("rootConfigJsoncFile"),
      });

      let outputText = "";
      const { output, summary } = project.runScriptAcrossWorkspaces({
        workspacePatterns: ["workspace-a"],
        script: "debug-parallel-max",
        parallel: true,
      });

      for await (const { outputChunk } of output) {
        outputText += outputChunk.decode();
      }

      await summary;

      await expect(outputText.trim()).toBe("5");
    });

    test("uses shell option from config", async () => {
      const project = createFileSystemProject({
        rootDirectory: getProjectRoot("rootConfigJsoncFile"),
      });

      let outputText = "";
      const { output, summary } = project.runScriptAcrossWorkspaces({
        workspacePatterns: ["workspace-a"],
        script: "debug-shell",
        parallel: true,
      });

      for await (const { outputChunk } of output) {
        outputText += outputChunk.decode();
      }

      await summary;

      await expect(outputText.trim()).toBe("system");
    });
  });
});
