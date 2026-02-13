import { expect, test, describe } from "bun:test";
import { BUN_LOCK_ERRORS } from "../../../src/internal/bun";
import { WORKSPACE_ERRORS } from "../../../src/workspaces/errors";
import { findWorkspaces } from "../../../src/workspaces/findWorkspaces";
import { getProjectRoot } from "../../fixtures/testProjects";
import { makeTestWorkspace, makeWorkspaceMapEntry } from "../../util/testData";

const defaultRootWorkspace = makeTestWorkspace({
  name: "test-root",
  isRoot: true,
  path: "",
  matchPattern: "",
});

describe("Test finding workspaces", () => {
  describe("basic behavior", () => {
    test("finds all workspaces in default project", () => {
      const defaultProject = findWorkspaces({
        rootDirectory: getProjectRoot("default"),
      });

      expect(defaultProject).toEqual({
        rootWorkspace: defaultRootWorkspace,
        workspaces: [
          makeTestWorkspace({
            name: "application-a",
            path: "applications/applicationA",
            matchPattern: "applications/*",
            scripts: ["a-workspaces", "all-workspaces", "application-a"],
          }),
          makeTestWorkspace({
            name: "application-b",
            path: "applications/applicationB",
            matchPattern: "applications/*",
            scripts: ["all-workspaces", "application-b", "b-workspaces"],
          }),
          makeTestWorkspace({
            name: "library-a",
            path: "libraries/libraryA",
            matchPattern: "libraries/**/*",
            scripts: ["a-workspaces", "all-workspaces", "library-a"],
          }),
          makeTestWorkspace({
            name: "library-b",
            path: "libraries/libraryB",
            matchPattern: "libraries/**/*",
            scripts: ["all-workspaces", "b-workspaces", "library-b"],
          }),
          makeTestWorkspace({
            name: "library-c",
            path: "libraries/nested/libraryC",
            matchPattern: "libraries/**/*",
            scripts: ["all-workspaces", "c-workspaces", "library-c"],
          }),
        ],
        workspaceMap: {
          "test-root": makeWorkspaceMapEntry({ alias: [] }),
          "application-a": makeWorkspaceMapEntry({}),
          "application-b": makeWorkspaceMapEntry({}),
          "library-a": makeWorkspaceMapEntry({}),
          "library-b": makeWorkspaceMapEntry({}),
          "library-c": makeWorkspaceMapEntry({}),
        },
      });
    });

    test("explicit globs match default behavior", () => {
      const defaultProject = findWorkspaces({
        rootDirectory: getProjectRoot("default"),
      });

      expect(defaultProject).toEqual({
        ...findWorkspaces({
          rootDirectory: getProjectRoot("default"),
          workspaceGlobs: ["applications/*", "libraries/**/*"],
        }),
      });
    });

    test("non-recursive glob excludes nested workspace from match pattern", () => {
      expect(
        findWorkspaces({
          rootDirectory: getProjectRoot("default"),
          workspaceGlobs: ["applications/*", "libraries/*"],
        }),
      ).toEqual({
        rootWorkspace: defaultRootWorkspace,
        workspaces: [
          makeTestWorkspace({
            name: "application-a",
            path: "applications/applicationA",
            matchPattern: "applications/*",
            scripts: ["a-workspaces", "all-workspaces", "application-a"],
          }),
          makeTestWorkspace({
            name: "application-b",
            path: "applications/applicationB",
            matchPattern: "applications/*",
            scripts: ["all-workspaces", "application-b", "b-workspaces"],
          }),
          makeTestWorkspace({
            name: "library-a",
            path: "libraries/libraryA",
            matchPattern: "libraries/*",
            scripts: ["a-workspaces", "all-workspaces", "library-a"],
          }),
          makeTestWorkspace({
            name: "library-b",
            path: "libraries/libraryB",
            matchPattern: "libraries/*",
            scripts: ["all-workspaces", "b-workspaces", "library-b"],
          }),
          makeTestWorkspace({
            name: "library-c",
            path: "libraries/nested/libraryC",
            matchPattern: "",
            scripts: ["all-workspaces", "c-workspaces", "library-c"],
          }),
        ],
        workspaceMap: {
          "test-root": makeWorkspaceMapEntry({ alias: [] }),
          "application-a": makeWorkspaceMapEntry({}),
          "application-b": makeWorkspaceMapEntry({}),
          "library-a": makeWorkspaceMapEntry({}),
          "library-b": makeWorkspaceMapEntry({}),
          "library-c": makeWorkspaceMapEntry({}),
        },
      });
    });

    test("subset glob shows unmatched workspaces with empty match pattern", () => {
      expect(
        findWorkspaces({
          rootDirectory: getProjectRoot("default"),
          workspaceGlobs: ["applications/*"],
        }),
      ).toEqual({
        rootWorkspace: defaultRootWorkspace,
        workspaces: [
          makeTestWorkspace({
            name: "application-a",
            path: "applications/applicationA",
            matchPattern: "applications/*",
            scripts: ["a-workspaces", "all-workspaces", "application-a"],
          }),
          makeTestWorkspace({
            name: "application-b",
            path: "applications/applicationB",
            matchPattern: "applications/*",
            scripts: ["all-workspaces", "application-b", "b-workspaces"],
          }),
          makeTestWorkspace({
            name: "library-a",
            path: "libraries/libraryA",
            matchPattern: "",
            scripts: ["a-workspaces", "all-workspaces", "library-a"],
          }),
          makeTestWorkspace({
            name: "library-b",
            path: "libraries/libraryB",
            matchPattern: "",
            scripts: ["all-workspaces", "b-workspaces", "library-b"],
          }),
          makeTestWorkspace({
            name: "library-c",
            path: "libraries/nested/libraryC",
            matchPattern: "",
            scripts: ["all-workspaces", "c-workspaces", "library-c"],
          }),
        ],
        workspaceMap: {
          "test-root": makeWorkspaceMapEntry({ alias: [] }),
          "application-a": makeWorkspaceMapEntry({}),
          "application-b": makeWorkspaceMapEntry({}),
          "library-a": makeWorkspaceMapEntry({}),
          "library-b": makeWorkspaceMapEntry({}),
          "library-c": makeWorkspaceMapEntry({}),
        },
      });
    });
  });

  test("ignores node_modules workspace", () => {
    const defaultProject = findWorkspaces({
      rootDirectory: getProjectRoot("withNodeModuleWorkspace"),
    });

    expect(defaultProject).toEqual({
      rootWorkspace: defaultRootWorkspace,
      workspaces: [
        makeTestWorkspace({
          name: "application-a",
          path: "applications/applicationA",
          matchPattern: "applications/*",
          scripts: ["a-workspaces", "all-workspaces", "application-a"],
        }),
        makeTestWorkspace({
          name: "application-b",
          path: "applications/applicationB",
          matchPattern: "applications/*",
          scripts: ["all-workspaces", "application-b", "b-workspaces"],
        }),
        makeTestWorkspace({
          name: "library-a",
          path: "libraries/libraryA",
          matchPattern: "libraries/**/*",
          scripts: ["a-workspaces", "all-workspaces", "library-a"],
        }),
        makeTestWorkspace({
          name: "library-b",
          path: "libraries/libraryB",
          matchPattern: "libraries/**/*",
          scripts: ["all-workspaces", "b-workspaces", "library-b"],
        }),
        makeTestWorkspace({
          name: "library-c",
          path: "libraries/nested/libraryC",
          matchPattern: "libraries/**/*",
          scripts: ["all-workspaces", "c-workspaces", "library-c"],
        }),
      ],
      workspaceMap: {
        "test-root": makeWorkspaceMapEntry({ alias: [] }),
        "application-a": makeWorkspaceMapEntry({}),
        "application-b": makeWorkspaceMapEntry({}),
        "library-a": makeWorkspaceMapEntry({}),
        "library-b": makeWorkspaceMapEntry({}),
        "library-c": makeWorkspaceMapEntry({}),
      },
    });
  });

  describe("invalid projects", () => {
    test("throws for bad JSON", () => {
      expect(() =>
        findWorkspaces({
          rootDirectory: getProjectRoot("invalidBadJson"),
        }),
      ).toThrow(BUN_LOCK_ERRORS.BunLockNotFound);
    });

    test("throws for missing name", () => {
      expect(() =>
        findWorkspaces({
          rootDirectory: getProjectRoot("invalidNoName"),
        }),
      ).toThrow(BUN_LOCK_ERRORS.BunLockNotFound);
    });

    test("throws for duplicate name", () => {
      expect(() =>
        findWorkspaces({
          rootDirectory: getProjectRoot("invalidDuplicateName"),
        }),
      ).toThrow(BUN_LOCK_ERRORS.BunLockNotFound);
    });

    test("throws for duplicate alias", () => {
      expect(() =>
        findWorkspaces({
          rootDirectory: getProjectRoot("invalidDuplicateAlias"),
        }),
      ).toThrow(WORKSPACE_ERRORS.AliasConflict);
    });

    test("throws for invalid workspace name", () => {
      expect(() =>
        findWorkspaces({
          rootDirectory: getProjectRoot("badWorkspaceInvalidName"),
        }),
      ).toThrow(WORKSPACE_ERRORS.InvalidWorkspaceName);
    });

    test("throws for bad type workspaces", () => {
      expect(() =>
        findWorkspaces({
          rootDirectory: getProjectRoot("invalidBadTypeWorkspaces"),
        }),
      ).toThrow(BUN_LOCK_ERRORS.BunLockNotFound);
    });

    test("throws for invalid scripts type", () => {
      expect(() =>
        findWorkspaces({
          rootDirectory: getProjectRoot("invalidBadTypeScripts"),
        }),
      ).toThrow(WORKSPACE_ERRORS.InvalidScripts);
    });

    test("throws for missing package.json", () => {
      expect(() =>
        findWorkspaces({
          rootDirectory: getProjectRoot("invalidNoPackageJson"),
        }),
      ).toThrow(BUN_LOCK_ERRORS.BunLockNotFound);
    });

    test("throws for bad workspace glob type", () => {
      expect(() =>
        findWorkspaces({
          rootDirectory: getProjectRoot("invalidBadWorkspaceGlobType"),
        }),
      ).toThrow(BUN_LOCK_ERRORS.BunLockNotFound);
    });

    test("throws for workspace glob outside root", () => {
      expect(() =>
        findWorkspaces({
          rootDirectory: getProjectRoot("invalidBadWorkspaceGlobOutsideRoot"),
        }),
      ).toThrow(BUN_LOCK_ERRORS.BunLockNotFound);
    });

    test("throws for alias conflicting with workspace name", () => {
      expect(() =>
        findWorkspaces({
          rootDirectory: getProjectRoot("invalidAliasConflict"),
          workspaceAliases: {
            deprecated_appA: "application-a",
            "application-b": "library-a",
          },
        }),
      ).toThrow(WORKSPACE_ERRORS.AliasConflict);
    });

    test("throws for alias pointing to nonexistent workspace", () => {
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
  });

  test("finds workspaces with catalog form", () => {
    const defaultProject = findWorkspaces({
      rootDirectory: getProjectRoot("withCatalogSimple"),
    });
    expect(defaultProject).toEqual({
      rootWorkspace: defaultRootWorkspace,
      workspaces: [
        makeTestWorkspace({
          name: "application-1a",
          path: "applications/applicationA",
          matchPattern: "applications/*",
          scripts: ["a-workspaces", "all-workspaces", "application-a"],
        }),
        makeTestWorkspace({
          name: "application-1b",
          path: "applications/applicationB",
          matchPattern: "applications/*",
          scripts: ["all-workspaces", "application-b", "b-workspaces"],
        }),
        makeTestWorkspace({
          name: "library-1a",
          path: "libraries/libraryA",
          matchPattern: "libraries/*",
          scripts: ["a-workspaces", "all-workspaces", "library-a"],
        }),
        makeTestWorkspace({
          name: "library-1b",
          path: "libraries/libraryB",
          matchPattern: "libraries/*",
          scripts: ["all-workspaces", "b-workspaces", "library-b"],
        }),
      ],
      workspaceMap: {
        "test-root": makeWorkspaceMapEntry({ alias: [] }),
        "application-1a": makeWorkspaceMapEntry({}),
        "application-1b": makeWorkspaceMapEntry({}),
        "library-1a": makeWorkspaceMapEntry({}),
        "library-1b": makeWorkspaceMapEntry({}),
      },
    });
  });

  test("includes root workspace when configured", () => {
    const defaultProject = findWorkspaces({
      rootDirectory: getProjectRoot("withRootWorkspace"),
      includeRootWorkspace: true,
    });
    const rootWorkspaceWithConfig = makeTestWorkspace({
      name: "test-root",
      isRoot: true,
      path: "",
      matchPattern: "",
      scripts: ["all-workspaces", "root-workspace"],
      aliases: ["my-root-alias"],
    });
    expect(defaultProject).toEqual({
      rootWorkspace: rootWorkspaceWithConfig,
      workspaces: [
        rootWorkspaceWithConfig,
        makeTestWorkspace({
          name: "application-1a",
          path: "applications/applicationA",
          matchPattern: "applications/*",
          scripts: ["a-workspaces", "all-workspaces", "application-a"],
        }),
        makeTestWorkspace({
          name: "application-1b",
          path: "applications/applicationB",
          matchPattern: "applications/*",
          scripts: ["all-workspaces", "application-b", "b-workspaces"],
        }),
        makeTestWorkspace({
          name: "library-1a",
          path: "libraries/libraryA",
          matchPattern: "libraries/*",
          scripts: ["a-workspaces", "all-workspaces", "library-a"],
        }),
        makeTestWorkspace({
          name: "library-1b",
          path: "libraries/libraryB",
          matchPattern: "libraries/*",
          scripts: ["all-workspaces", "b-workspaces", "library-b"],
        }),
      ],
      workspaceMap: {
        "test-root": makeWorkspaceMapEntry({ alias: ["my-root-alias"] }),
        "application-1a": makeWorkspaceMapEntry({}),
        "application-1b": makeWorkspaceMapEntry({}),
        "library-1a": makeWorkspaceMapEntry({}),
        "library-1b": makeWorkspaceMapEntry({}),
      },
    });
  });
});
