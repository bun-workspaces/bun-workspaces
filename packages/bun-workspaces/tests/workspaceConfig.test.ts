import path from "path";
import { expect, test, describe, spyOn } from "bun:test";
import { loadConfigFile } from "../src/config";
import { InvalidJSONError } from "../src/config/util/loadConfig";
import {
  loadWorkspaceConfig,
  validateWorkspaceConfig,
  WORKSPACE_CONFIG_ERRORS,
} from "../src/config/workspaceConfig";
import { logger } from "../src/internal/logger";
import { _internalCreateFileSystemProject } from "../src/project";
import { findWorkspaces } from "../src/workspaces";
import { createWorkspaceMapEntry } from "./findWorkspaces.test";
import { getProjectRoot } from "./fixtures/testProjects";
import { withWindowsPath } from "./util/windows";

/**
 * ########
 * # NOTE #
 * ########
 *
 * The workspace config was the first config to use the current
 * utils for config loading, so these tests are more thorough/verbose
 * than for other config types, which helps cover the shared code used
 * for config loading.
 */

describe("workspace config", () => {
  describe("loadWorkspaceConfig", () => {
    test("returns config for application-a in packageFileMix project", () => {
      const config = loadWorkspaceConfig(
        path.join(
          getProjectRoot("workspaceConfigPackageFileMix"),
          withWindowsPath("applications/application-a"),
        ),
      );
      expect(config).toEqual({
        aliases: ["appA"],
        scripts: {
          "all-workspaces": {
            order: 1,
          },
        },
      });
    });

    test("returns config for application-b in packageFileMix project", () => {
      const config = loadWorkspaceConfig(
        path.join(
          getProjectRoot("workspaceConfigPackageFileMix"),
          withWindowsPath("applications/application-b"),
        ),
      );
      expect(config).toEqual({
        aliases: ["appB_file"],
        scripts: {
          "all-workspaces": {
            order: 0,
          },
          "b-workspaces": {
            order: 2,
          },
        },
      });
    });

    test("returns config for library-a in packageFileMix project", () => {
      const config = loadWorkspaceConfig(
        path.join(
          getProjectRoot("workspaceConfigPackageFileMix"),
          withWindowsPath("libraries/library-a"),
        ),
      );
      expect(config).toEqual({
        aliases: ["libA_file"],
        scripts: {},
      });
    });

    test("returns config for library-b in packageFileMix project", () => {
      const config = loadWorkspaceConfig(
        path.join(
          getProjectRoot("workspaceConfigPackageFileMix"),
          withWindowsPath("libraries/library-b"),
        ),
      );
      expect(config).toEqual({
        aliases: ["libB", "libB2"],
        scripts: {
          "all-workspaces": {
            order: 100,
          },
          "b-workspaces": {
            order: 2,
          },
        },
      });
    });

    test("returns empty config for library-c in packageFileMix project", () => {
      const config = loadWorkspaceConfig(
        path.join(
          getProjectRoot("workspaceConfigPackageFileMix"),
          withWindowsPath("libraries/library-c"),
        ),
      );
      expect(config).toEqual({
        aliases: [],
        scripts: {},
      });
    });

    test("returns empty config for application-c in packageFileMix project", () => {
      const config = loadWorkspaceConfig(
        path.join(
          getProjectRoot("workspaceConfigPackageFileMix"),
          withWindowsPath("applications/application-c"),
        ),
      );
      expect(config).toEqual({
        aliases: [],
        scripts: {},
      });
    });

    test("returns config for application-a in fileOnly project", () => {
      const config = loadWorkspaceConfig(
        path.join(
          getProjectRoot("workspaceConfigFileOnly"),
          withWindowsPath("applications/application-a"),
        ),
      );
      expect(config).toEqual({
        aliases: ["appA"],
        scripts: {
          "all-workspaces": {
            order: 1,
          },
        },
      });
    });
  });

  describe("loadWorkspaceConfig with invalid JSON", () => {
    test("throws for application-a", () => {
      expect(() =>
        loadWorkspaceConfig(
          path.join(
            getProjectRoot("workspaceConfigInvalidJson"),
            withWindowsPath("applications/application-a"),
          ),
        ),
      ).toThrow(InvalidJSONError);
    });

    test("throws for application-b", () => {
      expect(() =>
        loadWorkspaceConfig(
          path.join(
            getProjectRoot("workspaceConfigInvalidJson"),
            withWindowsPath("applications/application-b"),
          ),
        ),
      ).toThrow(InvalidJSONError);
    });
  });

  describe("validateWorkspaceConfig", () => {
    test("throws when alias is nested array", () => {
      expect(() =>
        validateWorkspaceConfig({
          // @ts-expect-error - Invalid config
          alias: [["invalid"]],
        }),
      ).toThrow(WORKSPACE_CONFIG_ERRORS.InvalidWorkspaceConfig);
    });

    test("throws when alias is object", () => {
      expect(() =>
        validateWorkspaceConfig({
          // @ts-expect-error - Invalid config
          alias: {},
        }),
      ).toThrow(WORKSPACE_CONFIG_ERRORS.InvalidWorkspaceConfig);
    });

    test("throws when alias is number", () => {
      expect(() =>
        validateWorkspaceConfig({
          // @ts-expect-error - Invalid config
          alias: 123,
        }),
      ).toThrow(WORKSPACE_CONFIG_ERRORS.InvalidWorkspaceConfig);
    });

    test("throws when alias array contains non-strings", () => {
      expect(() =>
        validateWorkspaceConfig({
          // @ts-expect-error - Invalid config
          alias: [123, null],
        }),
      ).toThrow(WORKSPACE_CONFIG_ERRORS.InvalidWorkspaceConfig);
    });
  });

  describe("loadWorkspaceConfig with invalid config", () => {
    test("throws for application-a", () => {
      expect(() =>
        loadWorkspaceConfig(
          path.join(
            getProjectRoot("workspaceConfigInvalidConfig"),
            withWindowsPath("applications/application-a"),
          ),
        ),
      ).toThrow(WORKSPACE_CONFIG_ERRORS.InvalidWorkspaceConfig);
    });

    test("throws for application-b", () => {
      expect(() =>
        loadWorkspaceConfig(
          path.join(
            getProjectRoot("workspaceConfigInvalidConfig"),
            withWindowsPath("applications/application-b"),
          ),
        ),
      ).toThrow(WORKSPACE_CONFIG_ERRORS.InvalidWorkspaceConfig);
    });

    test("throws for application-c", () => {
      expect(() =>
        loadWorkspaceConfig(
          path.join(
            getProjectRoot("workspaceConfigInvalidConfig"),
            withWindowsPath("applications/application-c"),
          ),
        ),
      ).toThrow(WORKSPACE_CONFIG_ERRORS.InvalidWorkspaceConfig);
    });

    test("throws for application-d", () => {
      expect(() =>
        loadWorkspaceConfig(
          path.join(
            getProjectRoot("workspaceConfigInvalidConfig"),
            withWindowsPath("applications/application-d"),
          ),
        ),
      ).toThrow(WORKSPACE_CONFIG_ERRORS.InvalidWorkspaceConfig);
    });

    test("throws for application-e", () => {
      expect(() =>
        loadWorkspaceConfig(
          path.join(
            getProjectRoot("workspaceConfigInvalidConfig"),
            withWindowsPath("applications/application-e"),
          ),
        ),
      ).toThrow(WORKSPACE_CONFIG_ERRORS.InvalidWorkspaceConfig);
    });

    test("throws for application-f", () => {
      expect(() =>
        loadWorkspaceConfig(
          path.join(
            getProjectRoot("workspaceConfigInvalidConfig"),
            withWindowsPath("applications/application-f"),
          ),
        ),
      ).toThrow(WORKSPACE_CONFIG_ERRORS.InvalidWorkspaceConfig);
    });

    test("throws for application-g", () => {
      expect(() =>
        loadWorkspaceConfig(
          path.join(
            getProjectRoot("workspaceConfigInvalidConfig"),
            withWindowsPath("applications/application-g"),
          ),
        ),
      ).toThrow(WORKSPACE_CONFIG_ERRORS.InvalidWorkspaceConfig);
    });

    test("throws for application-h", () => {
      expect(() =>
        loadWorkspaceConfig(
          path.join(
            getProjectRoot("workspaceConfigInvalidConfig"),
            withWindowsPath("applications/application-h"),
          ),
        ),
      ).toThrow(WORKSPACE_CONFIG_ERRORS.InvalidWorkspaceConfig);
    });
  });

  describe("findWorkspaces with workspace configs", () => {
    test("returns expected result for workspaceConfigFileOnly project", () => {
      expect(
        findWorkspaces({
          rootDirectory: getProjectRoot("workspaceConfigFileOnly"),
        }),
      ).toEqual({
        rootWorkspace: expect.any(Object),
        workspaces: [
          {
            aliases: ["appA"],
            isRoot: false,
            matchPattern: "applications/*",
            name: "application-1a",
            path: withWindowsPath("applications/application-a"),
            scripts: ["a-workspaces", "all-workspaces", "application-a"],
            dependencies: [],
            dependents: [],
          },
          {
            aliases: ["appB"],
            isRoot: false,
            matchPattern: "applications/*",
            name: "application-1b",
            path: withWindowsPath("applications/application-b"),
            scripts: ["all-workspaces", "application-b", "b-workspaces"],
            dependencies: [],
            dependents: [],
          },
          {
            aliases: ["libA", "libA2"],
            isRoot: false,
            matchPattern: "libraries/*",
            name: "library-1a",
            path: withWindowsPath("libraries/library-a"),
            scripts: ["a-workspaces", "all-workspaces", "library-a"],
            dependencies: [],
            dependents: [],
          },
          {
            aliases: ["libB"],
            isRoot: false,
            matchPattern: "libraries/*",
            name: "library-1b",
            path: withWindowsPath("libraries/library-b"),
            scripts: ["all-workspaces", "b-workspaces", "library-b"],
            dependencies: [],
            dependents: [],
          },
        ],
        workspaceMap: {
          "test-root": createWorkspaceMapEntry({ alias: [] }),
          "application-1a": createWorkspaceMapEntry({
            alias: ["appA"],
            scripts: {
              "all-workspaces": {
                order: 1,
              },
            },
          }),
          "application-1b": createWorkspaceMapEntry({ alias: ["appB"] }),
          "library-1a": createWorkspaceMapEntry({ alias: ["libA", "libA2"] }),
          "library-1b": createWorkspaceMapEntry({ alias: ["libB"] }),
        },
      });
    });

    test("returns expected result for workspaceConfigPackageOnly project", () => {
      expect(
        findWorkspaces({
          rootDirectory: getProjectRoot("workspaceConfigPackageOnly"),
        }),
      ).toEqual({
        rootWorkspace: expect.any(Object),
        workspaces: [
          {
            aliases: ["appA"],
            isRoot: false,
            matchPattern: "applications/*",
            name: "application-1a",
            path: withWindowsPath("applications/application-a"),
            scripts: ["a-workspaces", "all-workspaces", "application-a"],
            dependencies: [],
            dependents: [],
          },
          {
            aliases: ["appB", "appB2"],
            isRoot: false,
            matchPattern: "applications/*",
            name: "application-1b",
            path: withWindowsPath("applications/application-b"),
            scripts: ["all-workspaces", "application-b", "b-workspaces"],
            dependencies: [],
            dependents: [],
          },
          {
            aliases: ["libA", "libA2"],
            isRoot: false,
            matchPattern: "libraries/*",
            name: "library-1a",
            path: withWindowsPath("libraries/library-a"),
            scripts: ["a-workspaces", "all-workspaces", "library-a"],
            dependencies: [],
            dependents: [],
          },
          {
            aliases: ["libB"],
            isRoot: false,
            matchPattern: "libraries/*",
            name: "library-1b",
            path: withWindowsPath("libraries/library-b"),
            scripts: ["all-workspaces", "b-workspaces", "library-b"],
            dependencies: [],
            dependents: [],
          },
        ],
        workspaceMap: {
          "test-root": createWorkspaceMapEntry({ alias: [] }),
          "application-1a": createWorkspaceMapEntry({ alias: ["appA"] }),
          "application-1b": createWorkspaceMapEntry({
            alias: ["appB", "appB2"],
          }),
          "library-1a": createWorkspaceMapEntry({ alias: ["libA", "libA2"] }),
          "library-1b": createWorkspaceMapEntry({ alias: ["libB"] }),
        },
      });
    });

    test("returns expected result for workspaceConfigPackageFileMix project", () => {
      expect(
        findWorkspaces({
          rootDirectory: getProjectRoot("workspaceConfigPackageFileMix"),
        }),
      ).toEqual({
        workspaces: [
          {
            aliases: ["appA"],
            isRoot: false,
            matchPattern: "applications/*",
            name: "application-1a",
            path: withWindowsPath("applications/application-a"),
            scripts: ["a-workspaces", "all-workspaces", "application-a"],
            dependencies: [],
            dependents: [],
          },
          {
            aliases: ["appB_file"],
            isRoot: false,
            matchPattern: "applications/*",
            name: "application-1b",
            path: withWindowsPath("applications/application-b"),
            scripts: ["all-workspaces", "application-b", "b-workspaces"],
            dependencies: [],
            dependents: [],
          },
          {
            aliases: [],
            isRoot: false,
            matchPattern: "applications/*",
            name: "application-1c",
            path: withWindowsPath("applications/application-c"),
            scripts: ["all-workspaces", "application-c", "c-workspaces"],
            dependencies: [],
            dependents: [],
          },
          {
            aliases: ["libA_file"],
            isRoot: false,
            matchPattern: "libraries/*",
            name: "library-1a",
            path: withWindowsPath("libraries/library-a"),
            scripts: ["a-workspaces", "all-workspaces", "library-a"],
            dependencies: [],
            dependents: [],
          },
          {
            aliases: ["libB", "libB2"],
            isRoot: false,
            matchPattern: "libraries/*",
            name: "library-1b",
            path: withWindowsPath("libraries/library-b"),
            scripts: ["all-workspaces", "b-workspaces", "library-b"],
            dependencies: [],
            dependents: [],
          },
          {
            aliases: [],
            isRoot: false,
            matchPattern: "libraries/*",
            name: "library-1c",
            path: withWindowsPath("libraries/library-c"),
            scripts: ["all-workspaces", "c-workspaces", "library-c"],
            dependencies: [],
            dependents: [],
          },
        ],
        rootWorkspace: expect.any(Object),
        workspaceMap: {
          "test-root": createWorkspaceMapEntry({ alias: [] }),
          "application-1a": createWorkspaceMapEntry({
            alias: ["appA"],
            scripts: {
              "all-workspaces": {
                order: 1,
              },
            },
          }),
          "application-1b": createWorkspaceMapEntry({
            alias: ["appB_file"],
            scripts: {
              "all-workspaces": {
                order: 0,
              },
              "b-workspaces": {
                order: 2,
              },
            },
          }),
          "application-1c": createWorkspaceMapEntry({ alias: [] }),
          "library-1a": createWorkspaceMapEntry({
            alias: ["libA_file"],
          }),
          "library-1b": createWorkspaceMapEntry({
            alias: ["libB", "libB2"],
            scripts: {
              "all-workspaces": {
                order: 100,
              },
              "b-workspaces": {
                order: 2,
              },
            },
          }),
          "library-1c": createWorkspaceMapEntry({ alias: [] }),
        },
      });
    });
  });

  describe("deprecated and new config mix", () => {
    test("warns on multiple configs and merges workspace config", () => {
      const warnSpy = spyOn(logger, "warn");

      const project = _internalCreateFileSystemProject({
        rootDirectory: getProjectRoot("workspaceConfigDeprecatedConfigMix"),
        workspaceAliases:
          loadConfigFile(
            path.join(
              getProjectRoot("workspaceConfigDeprecatedConfigMix"),
              "bw.json",
            ),
          )?.project?.workspaceAliases ?? undefined,
      });

      expect(warnSpy).toHaveBeenCalledWith(
        `Found multiple workspace configs:
  ${withWindowsPath(path.relative(process.cwd(), path.join(getProjectRoot("workspaceConfigDeprecatedConfigMix"), "libraries/library-a") + "/bw.workspace.jsonc"))}
  ${withWindowsPath(path.relative(process.cwd(), path.join(getProjectRoot("workspaceConfigDeprecatedConfigMix"), "libraries/library-a") + "/bw.workspace.json"))}
  ${withWindowsPath(path.relative(process.cwd(), path.join(getProjectRoot("workspaceConfigDeprecatedConfigMix"), "libraries/library-a", "package.json") + '["bw"]'))}
  Using config at ${withWindowsPath(path.relative(process.cwd(), path.join(getProjectRoot("workspaceConfigDeprecatedConfigMix"), "libraries/library-a", "bw.workspace.jsonc")))}`,
      );

      expect(project.workspaces).toEqual([
        {
          aliases: ["deprecated_appA", "appA"],
          isRoot: false,
          matchPattern: "applications/*",
          name: "application-1a",
          path: withWindowsPath("applications/application-a"),
          scripts: ["a-workspaces", "all-workspaces", "application-a"],
          dependencies: [],
          dependents: [],
        },
        {
          aliases: ["deprecated_appB", "appB_file"],
          isRoot: false,
          matchPattern: "applications/*",
          name: "application-1b",
          path: withWindowsPath("applications/application-b"),
          scripts: ["all-workspaces", "application-b", "b-workspaces"],
          dependencies: [],
          dependents: [],
        },
        {
          aliases: [],
          isRoot: false,
          matchPattern: "applications/*",
          name: "application-1c",
          path: withWindowsPath("applications/application-c"),
          scripts: ["all-workspaces", "application-c", "c-workspaces"],
          dependencies: [],
          dependents: [],
        },
        {
          aliases: ["deprecated_libA", "libA_file"],
          isRoot: false,
          matchPattern: "libraries/*",
          name: "library-1a",
          path: withWindowsPath("libraries/library-a"),
          scripts: ["a-workspaces", "all-workspaces", "library-a"],
          dependencies: [],
          dependents: [],
        },
        {
          aliases: ["deprecated_libB", "libB", "libB2"],
          isRoot: false,
          matchPattern: "libraries/*",
          name: "library-1b",
          path: withWindowsPath("libraries/library-b"),
          scripts: ["all-workspaces", "b-workspaces", "library-b"],
          dependencies: [],
          dependents: [],
        },
        {
          aliases: [],
          isRoot: false,
          matchPattern: "libraries/*",
          name: "library-1c",
          path: withWindowsPath("libraries/library-c"),
          scripts: ["all-workspaces", "c-workspaces", "library-c"],
          dependencies: [],
          dependents: [],
        },
      ]);
    });
  });
});
