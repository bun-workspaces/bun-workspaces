import { expect, test, describe } from "bun:test";
import { resolveWorkspaceConfig, type WorkspaceConfig } from "../src/config";
import { BUN_LOCK_ERRORS } from "../src/internal/bun";
import { WORKSPACE_ERRORS } from "../src/workspaces/errors";
import { findWorkspaces } from "../src/workspaces/findWorkspaces";
import { getProjectRoot } from "./testProjects";
import { withWindowsPath } from "./util/windows";

export const createWorkspaceMapEntry = (config: WorkspaceConfig) => ({
  workspace: expect.any(Object),
  config: resolveWorkspaceConfig(config),
  packageJson: expect.any(Object),
});

describe("Test finding workspaces", () => {
  test("Find workspaces basic behavior", async () => {
    const defaultProject = findWorkspaces({
      rootDirectory: getProjectRoot("default"),
    });

    expect(defaultProject).toEqual({
      rootWorkspace: {
        name: "test-root",
        isRoot: true,
        matchPattern: "",
        path: "",
        scripts: [],
        aliases: [],
        dependencies: [],
        dependents: [],
      },
      workspaces: [
        {
          name: "application-a",
          isRoot: false,
          matchPattern: "applications/*",
          path: withWindowsPath("applications/applicationA"),
          scripts: ["a-workspaces", "all-workspaces", "application-a"],
          aliases: [],
          dependencies: [],
          dependents: [],
        },
        {
          name: "application-b",
          isRoot: false,
          matchPattern: "applications/*",
          path: withWindowsPath("applications/applicationB"),
          scripts: ["all-workspaces", "application-b", "b-workspaces"],
          aliases: [],
          dependencies: [],
          dependents: [],
        },
        {
          name: "library-a",
          isRoot: false,
          matchPattern: "libraries/**/*",
          path: withWindowsPath("libraries/libraryA"),
          scripts: ["a-workspaces", "all-workspaces", "library-a"],
          aliases: [],
          dependencies: [],
          dependents: [],
        },
        {
          name: "library-b",
          isRoot: false,
          matchPattern: "libraries/**/*",
          path: withWindowsPath("libraries/libraryB"),
          scripts: ["all-workspaces", "b-workspaces", "library-b"],
          aliases: [],
          dependencies: [],
          dependents: [],
        },
        {
          name: "library-c",
          isRoot: false,
          matchPattern: "libraries/**/*",
          path: withWindowsPath("libraries/nested/libraryC"),
          scripts: ["all-workspaces", "c-workspaces", "library-c"],
          aliases: [],
          dependencies: [],
          dependents: [],
        },
      ],
      workspaceMap: {
        "test-root": createWorkspaceMapEntry({ alias: [] }),
        "application-a": createWorkspaceMapEntry({}),
        "application-b": createWorkspaceMapEntry({}),
        "library-a": createWorkspaceMapEntry({}),
        "library-b": createWorkspaceMapEntry({}),
        "library-c": createWorkspaceMapEntry({}),
      },
    });

    expect(defaultProject).toEqual({
      ...findWorkspaces({
        rootDirectory: getProjectRoot("default"),
        workspaceGlobs: ["applications/*", "libraries/**/*"],
      }),
    });

    expect(
      findWorkspaces({
        rootDirectory: getProjectRoot("default"),
        workspaceGlobs: ["applications/*", "libraries/*"],
      }),
    ).toEqual({
      rootWorkspace: {
        name: "test-root",
        isRoot: true,
        matchPattern: "",
        path: "",
        scripts: [],
        aliases: [],
        dependencies: [],
        dependents: [],
      },
      workspaces: [
        {
          name: "application-a",
          isRoot: false,
          matchPattern: "applications/*",
          path: withWindowsPath("applications/applicationA"),
          scripts: ["a-workspaces", "all-workspaces", "application-a"],
          aliases: [],
          dependencies: [],
          dependents: [],
        },
        {
          name: "application-b",
          isRoot: false,
          matchPattern: "applications/*",
          path: withWindowsPath("applications/applicationB"),
          scripts: ["all-workspaces", "application-b", "b-workspaces"],
          aliases: [],
          dependencies: [],
          dependents: [],
        },
        {
          name: "library-a",
          isRoot: false,
          matchPattern: "libraries/*",
          path: withWindowsPath("libraries/libraryA"),
          scripts: ["a-workspaces", "all-workspaces", "library-a"],
          aliases: [],
          dependencies: [],
          dependents: [],
        },
        {
          name: "library-b",
          isRoot: false,
          matchPattern: "libraries/*",
          path: withWindowsPath("libraries/libraryB"),
          scripts: ["all-workspaces", "b-workspaces", "library-b"],
          aliases: [],
          dependencies: [],
          dependents: [],
        },
        {
          name: "library-c",
          isRoot: false,
          matchPattern: "",
          path: withWindowsPath("libraries/nested/libraryC"),
          scripts: ["all-workspaces", "c-workspaces", "library-c"],
          aliases: [],
          dependencies: [],
          dependents: [],
        },
      ],
      workspaceMap: {
        "test-root": createWorkspaceMapEntry({ alias: [] }),
        "application-a": createWorkspaceMapEntry({}),
        "application-b": createWorkspaceMapEntry({}),
        "library-a": createWorkspaceMapEntry({}),
        "library-b": createWorkspaceMapEntry({}),
        "library-c": createWorkspaceMapEntry({}),
      },
    });

    expect(
      findWorkspaces({
        rootDirectory: getProjectRoot("default"),
        workspaceGlobs: ["applications/*"],
      }),
    ).toEqual({
      rootWorkspace: {
        name: "test-root",
        isRoot: true,
        matchPattern: "",
        path: "",
        scripts: [],
        aliases: [],
        dependencies: [],
        dependents: [],
      },
      workspaces: [
        {
          name: "application-a",
          isRoot: false,
          matchPattern: "applications/*",
          path: withWindowsPath("applications/applicationA"),
          scripts: ["a-workspaces", "all-workspaces", "application-a"],
          aliases: [],
          dependencies: [],
          dependents: [],
        },
        {
          name: "application-b",
          isRoot: false,
          matchPattern: "applications/*",
          path: withWindowsPath("applications/applicationB"),
          scripts: ["all-workspaces", "application-b", "b-workspaces"],
          aliases: [],
          dependencies: [],
          dependents: [],
        },
        {
          name: "library-a",
          isRoot: false,
          matchPattern: "",
          path: withWindowsPath("libraries/libraryA"),
          scripts: ["a-workspaces", "all-workspaces", "library-a"],
          aliases: [],
          dependencies: [],
          dependents: [],
        },
        {
          name: "library-b",
          isRoot: false,
          matchPattern: "",
          path: withWindowsPath("libraries/libraryB"),
          scripts: ["all-workspaces", "b-workspaces", "library-b"],
          aliases: [],
          dependencies: [],
          dependents: [],
        },
        {
          name: "library-c",
          isRoot: false,
          matchPattern: "",
          path: withWindowsPath("libraries/nested/libraryC"),
          scripts: ["all-workspaces", "c-workspaces", "library-c"],
          aliases: [],
          dependencies: [],
          dependents: [],
        },
      ],
      workspaceMap: {
        "test-root": createWorkspaceMapEntry({ alias: [] }),
        "application-a": createWorkspaceMapEntry({}),
        "application-b": createWorkspaceMapEntry({}),
        "library-a": createWorkspaceMapEntry({}),
        "library-b": createWorkspaceMapEntry({}),
        "library-c": createWorkspaceMapEntry({}),
      },
    });
  });

  test("Ignore node_modules workspace", async () => {
    const defaultProject = findWorkspaces({
      rootDirectory: getProjectRoot("withNodeModuleWorkspace"),
    });

    expect(defaultProject).toEqual({
      rootWorkspace: {
        name: "test-root",
        isRoot: true,
        matchPattern: "",
        path: "",
        scripts: [],
        aliases: [],
        dependencies: [],
        dependents: [],
      },
      workspaces: [
        {
          name: "application-a",
          isRoot: false,
          matchPattern: "applications/*",
          path: withWindowsPath("applications/applicationA"),
          scripts: ["a-workspaces", "all-workspaces", "application-a"],
          aliases: [],
          dependencies: [],
          dependents: [],
        },
        {
          name: "application-b",
          isRoot: false,
          matchPattern: "applications/*",
          path: withWindowsPath("applications/applicationB"),
          scripts: ["all-workspaces", "application-b", "b-workspaces"],
          aliases: [],
          dependencies: [],
          dependents: [],
        },
        {
          name: "library-a",
          isRoot: false,
          matchPattern: "libraries/**/*",
          path: withWindowsPath("libraries/libraryA"),
          scripts: ["a-workspaces", "all-workspaces", "library-a"],
          aliases: [],
          dependencies: [],
          dependents: [],
        },
        {
          name: "library-b",
          isRoot: false,
          matchPattern: "libraries/**/*",
          path: withWindowsPath("libraries/libraryB"),
          scripts: ["all-workspaces", "b-workspaces", "library-b"],
          aliases: [],
          dependencies: [],
          dependents: [],
        },
        {
          name: "library-c",
          isRoot: false,
          matchPattern: "libraries/**/*",
          path: withWindowsPath("libraries/nested/libraryC"),
          scripts: ["all-workspaces", "c-workspaces", "library-c"],
          aliases: [],
          dependencies: [],
          dependents: [],
        },
      ],
      workspaceMap: {
        "test-root": createWorkspaceMapEntry({ alias: [] }),
        "application-a": createWorkspaceMapEntry({}),
        "application-b": createWorkspaceMapEntry({}),
        "library-a": createWorkspaceMapEntry({}),
        "library-b": createWorkspaceMapEntry({}),
        "library-c": createWorkspaceMapEntry({}),
      },
    });
  });

  test("Invalid workspaces from test projects", async () => {
    expect(() =>
      findWorkspaces({
        rootDirectory: getProjectRoot("invalidBadJson"),
      }),
    ).toThrow(BUN_LOCK_ERRORS.BunLockNotFound);

    expect(() =>
      findWorkspaces({
        rootDirectory: getProjectRoot("invalidNoName"),
      }),
    ).toThrow(BUN_LOCK_ERRORS.BunLockNotFound);

    expect(() =>
      findWorkspaces({
        rootDirectory: getProjectRoot("invalidDuplicateName"),
      }),
    ).toThrow(BUN_LOCK_ERRORS.BunLockNotFound);

    expect(() =>
      findWorkspaces({
        rootDirectory: getProjectRoot("invalidDuplicateAlias"),
      }),
    ).toThrow(WORKSPACE_ERRORS.AliasConflict);

    expect(() =>
      findWorkspaces({
        rootDirectory: getProjectRoot("badWorkspaceInvalidName"),
      }),
    ).toThrow(WORKSPACE_ERRORS.InvalidWorkspaceName);

    expect(() =>
      findWorkspaces({
        rootDirectory: getProjectRoot("invalidBadTypeWorkspaces"),
      }),
    ).toThrow(BUN_LOCK_ERRORS.BunLockNotFound);

    expect(() =>
      findWorkspaces({
        rootDirectory: getProjectRoot("invalidBadTypeScripts"),
      }),
    ).toThrow(WORKSPACE_ERRORS.InvalidScripts);

    expect(() =>
      findWorkspaces({
        rootDirectory: getProjectRoot("invalidNoPackageJson"),
      }),
    ).toThrow(BUN_LOCK_ERRORS.BunLockNotFound);

    expect(() =>
      findWorkspaces({
        rootDirectory: getProjectRoot("invalidBadWorkspaceGlobType"),
      }),
    ).toThrow(BUN_LOCK_ERRORS.BunLockNotFound);

    expect(() =>
      findWorkspaces({
        rootDirectory: getProjectRoot("invalidBadWorkspaceGlobOutsideRoot"),
      }),
    ).toThrow(BUN_LOCK_ERRORS.BunLockNotFound);

    expect(() =>
      findWorkspaces({
        rootDirectory: getProjectRoot("invalidAliasConflict"),
        workspaceAliases: {
          deprecated_appA: "application-a",
          "application-b": "library-a",
        },
      }),
    ).toThrow(WORKSPACE_ERRORS.AliasConflict);

    expect(() =>
      findWorkspaces({
        rootDirectory: getProjectRoot("invalidAliasNotFound"),
        workspaceAliases: {
          deprecated_appA: "application-a",
          appD: "application-d",
        },
      }),
    ).toThrow(WORKSPACE_ERRORS.AliasedWorkspaceNotFound);
  });

  test("Find workspaces with catalog form of package.json workspaces", async () => {
    const defaultProject = findWorkspaces({
      rootDirectory: getProjectRoot("withCatalogSimple"),
    });
    expect(defaultProject).toEqual({
      rootWorkspace: {
        name: "test-root",
        isRoot: true,
        matchPattern: "",
        path: "",
        scripts: [],
        aliases: [],
        dependencies: [],
        dependents: [],
      },
      workspaces: [
        {
          name: "application-1a",
          isRoot: false,
          matchPattern: "applications/*",
          path: withWindowsPath("applications/applicationA"),
          scripts: ["a-workspaces", "all-workspaces", "application-a"],
          aliases: [],
          dependencies: [],
          dependents: [],
        },
        {
          name: "application-1b",
          isRoot: false,
          matchPattern: "applications/*",
          path: withWindowsPath("applications/applicationB"),
          scripts: ["all-workspaces", "application-b", "b-workspaces"],
          aliases: [],
          dependencies: [],
          dependents: [],
        },
        {
          name: "library-1a",
          isRoot: false,
          matchPattern: "libraries/*",
          path: withWindowsPath("libraries/libraryA"),
          scripts: ["a-workspaces", "all-workspaces", "library-a"],
          aliases: [],
          dependencies: [],
          dependents: [],
        },
        {
          name: "library-1b",
          isRoot: false,
          matchPattern: "libraries/*",
          path: withWindowsPath("libraries/libraryB"),
          scripts: ["all-workspaces", "b-workspaces", "library-b"],
          aliases: [],
          dependencies: [],
          dependents: [],
        },
      ],
      workspaceMap: {
        "test-root": createWorkspaceMapEntry({ alias: [] }),
        "application-1a": createWorkspaceMapEntry({}),
        "application-1b": createWorkspaceMapEntry({}),
        "library-1a": createWorkspaceMapEntry({}),
        "library-1b": createWorkspaceMapEntry({}),
      },
    });
  });

  test("Find workspaces - Include root workspace", async () => {
    const defaultProject = findWorkspaces({
      rootDirectory: getProjectRoot("withRootWorkspace"),
      includeRootWorkspace: true,
    });
    expect(defaultProject).toEqual({
      rootWorkspace: {
        name: "test-root",
        isRoot: true,
        matchPattern: "",
        path: "",
        scripts: ["all-workspaces", "root-workspace"],
        aliases: ["my-root-alias"],
        dependencies: [],
        dependents: [],
      },
      workspaces: [
        {
          name: "test-root",
          isRoot: true,
          matchPattern: "",
          path: "",
          scripts: ["all-workspaces", "root-workspace"],
          aliases: ["my-root-alias"],
          dependencies: [],
          dependents: [],
        },
        {
          name: "application-1a",
          isRoot: false,
          matchPattern: "applications/*",
          path: withWindowsPath("applications/applicationA"),
          scripts: ["a-workspaces", "all-workspaces", "application-a"],
          aliases: [],
          dependencies: [],
          dependents: [],
        },
        {
          name: "application-1b",
          isRoot: false,
          matchPattern: "applications/*",
          path: withWindowsPath("applications/applicationB"),
          scripts: ["all-workspaces", "application-b", "b-workspaces"],
          aliases: [],
          dependencies: [],
          dependents: [],
        },
        {
          name: "library-1a",
          isRoot: false,
          matchPattern: "libraries/*",
          path: withWindowsPath("libraries/libraryA"),
          scripts: ["a-workspaces", "all-workspaces", "library-a"],
          aliases: [],
          dependencies: [],
          dependents: [],
        },
        {
          name: "library-1b",
          isRoot: false,
          matchPattern: "libraries/*",
          path: withWindowsPath("libraries/libraryB"),
          scripts: ["all-workspaces", "b-workspaces", "library-b"],
          aliases: [],
          dependencies: [],
          dependents: [],
        },
      ],
      workspaceMap: {
        "test-root": createWorkspaceMapEntry({ alias: ["my-root-alias"] }),
        "application-1a": createWorkspaceMapEntry({}),
        "application-1b": createWorkspaceMapEntry({}),
        "library-1a": createWorkspaceMapEntry({}),
        "library-1b": createWorkspaceMapEntry({}),
      },
    });
  });
});
