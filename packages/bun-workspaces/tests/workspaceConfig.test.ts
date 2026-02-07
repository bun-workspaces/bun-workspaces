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
import { getProjectRoot } from "./testProjects";
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

describe("Test workspace config", () => {
  test("loadWorkspaceConfig", () => {
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

    const config2 = loadWorkspaceConfig(
      path.join(
        getProjectRoot("workspaceConfigPackageFileMix"),
        withWindowsPath("applications/application-b"),
      ),
    );

    expect(config2).toEqual({
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

    const config3 = loadWorkspaceConfig(
      path.join(
        getProjectRoot("workspaceConfigPackageFileMix"),
        withWindowsPath("libraries/library-a"),
      ),
    );

    expect(config3).toEqual({
      aliases: ["libA_file"],
      scripts: {},
    });

    const config4 = loadWorkspaceConfig(
      path.join(
        getProjectRoot("workspaceConfigPackageFileMix"),
        withWindowsPath("libraries/library-b"),
      ),
    );

    expect(config4).toEqual({
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

    const config5 = loadWorkspaceConfig(
      path.join(
        getProjectRoot("workspaceConfigPackageFileMix"),
        withWindowsPath("libraries/library-c"),
      ),
    );
    expect(config5).toEqual({
      aliases: [],
      scripts: {},
    });

    const config6 = loadWorkspaceConfig(
      path.join(
        getProjectRoot("workspaceConfigPackageFileMix"),
        withWindowsPath("applications/application-c"),
      ),
    );
    expect(config6).toEqual({
      aliases: [],
      scripts: {},
    });

    const config7 = loadWorkspaceConfig(
      path.join(
        getProjectRoot("workspaceConfigFileOnly"),
        withWindowsPath("applications/application-a"),
      ),
    );
    expect(config7).toEqual({
      aliases: ["appA"],
      scripts: {
        "all-workspaces": {
          order: 1,
        },
      },
    });
  });

  test("loadWorkspaceConfig with invalid JSON", () => {
    expect(() =>
      loadWorkspaceConfig(
        path.join(
          getProjectRoot("workspaceConfigInvalidJson"),
          withWindowsPath("applications/application-a"),
        ),
      ),
    ).toThrow(InvalidJSONError);

    expect(() =>
      loadWorkspaceConfig(
        path.join(
          getProjectRoot("workspaceConfigInvalidJson"),
          withWindowsPath("applications/application-b"),
        ),
      ),
    ).toThrow(InvalidJSONError);
  });

  test("validateWorkspaceConfig", () => {
    expect(() =>
      validateWorkspaceConfig({
        // @ts-expect-error - Invalid config
        alias: [["invalid"]],
      }),
    ).toThrow(WORKSPACE_CONFIG_ERRORS.InvalidWorkspaceConfig);

    expect(() =>
      validateWorkspaceConfig({
        // @ts-expect-error - Invalid config
        alias: {},
      }),
    ).toThrow(WORKSPACE_CONFIG_ERRORS.InvalidWorkspaceConfig);

    expect(() =>
      validateWorkspaceConfig({
        // @ts-expect-error - Invalid config
        alias: 123,
      }),
    ).toThrow(WORKSPACE_CONFIG_ERRORS.InvalidWorkspaceConfig);

    expect(() =>
      validateWorkspaceConfig({
        // @ts-expect-error - Invalid config
        alias: [123, null],
      }),
    ).toThrow(WORKSPACE_CONFIG_ERRORS.InvalidWorkspaceConfig);
  });

  test("loadWorkspaceConfig with invalid config", () => {
    expect(() =>
      loadWorkspaceConfig(
        path.join(
          getProjectRoot("workspaceConfigInvalidConfig"),
          withWindowsPath("applications/application-a"),
        ),
      ),
    ).toThrow(WORKSPACE_CONFIG_ERRORS.InvalidWorkspaceConfig);

    expect(() =>
      loadWorkspaceConfig(
        path.join(
          getProjectRoot("workspaceConfigInvalidConfig"),
          withWindowsPath("applications/application-b"),
        ),
      ),
    ).toThrow(WORKSPACE_CONFIG_ERRORS.InvalidWorkspaceConfig);

    expect(() =>
      loadWorkspaceConfig(
        path.join(
          getProjectRoot("workspaceConfigInvalidConfig"),
          withWindowsPath("applications/application-c"),
        ),
      ),
    ).toThrow(WORKSPACE_CONFIG_ERRORS.InvalidWorkspaceConfig);

    expect(() =>
      loadWorkspaceConfig(
        path.join(
          getProjectRoot("workspaceConfigInvalidConfig"),
          withWindowsPath("applications/application-d"),
        ),
      ),
    ).toThrow(WORKSPACE_CONFIG_ERRORS.InvalidWorkspaceConfig);

    expect(() =>
      loadWorkspaceConfig(
        path.join(
          getProjectRoot("workspaceConfigInvalidConfig"),
          withWindowsPath("applications/application-e"),
        ),
      ),
    ).toThrow(WORKSPACE_CONFIG_ERRORS.InvalidWorkspaceConfig);

    expect(() =>
      loadWorkspaceConfig(
        path.join(
          getProjectRoot("workspaceConfigInvalidConfig"),
          withWindowsPath("applications/application-f"),
        ),
      ),
    ).toThrow(WORKSPACE_CONFIG_ERRORS.InvalidWorkspaceConfig);

    expect(() =>
      loadWorkspaceConfig(
        path.join(
          getProjectRoot("workspaceConfigInvalidConfig"),
          withWindowsPath("applications/application-g"),
        ),
      ),
    ).toThrow(WORKSPACE_CONFIG_ERRORS.InvalidWorkspaceConfig);

    expect(() =>
      loadWorkspaceConfig(
        path.join(
          getProjectRoot("workspaceConfigInvalidConfig"),
          withWindowsPath("applications/application-h"),
        ),
      ),
    ).toThrow(WORKSPACE_CONFIG_ERRORS.InvalidWorkspaceConfig);
  });

  test("findWorkspaces results with workspace configs", () => {
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
        "application-1b": createWorkspaceMapEntry({ alias: ["appB", "appB2"] }),
        "library-1a": createWorkspaceMapEntry({ alias: ["libA", "libA2"] }),
        "library-1b": createWorkspaceMapEntry({ alias: ["libB"] }),
      },
    });

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

  test("Project with mix of deprecated and new config", () => {
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
