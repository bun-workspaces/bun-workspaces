import { describe, expect, test } from "bun:test";
import { computeExternalDependencyChanges } from "../../../src/affected/externalDependencyChanges";
import {
  parseBunLockPackageVersions,
  type BunLockVersionMap,
} from "../../../src/internal/bun/bunLock";
import { makeTestWorkspace } from "../../util/testData";

describe("parseBunLockPackageVersions", () => {
  test("extracts name and version from each packages entry", () => {
    const lock = JSON.stringify({
      lockfileVersion: 1,
      workspaces: { "": { name: "test-root" } },
      packages: {
        lodash: ["lodash@4.17.21", {}, "<sha>"],
        react: ["react@18.0.0", {}, "<sha>"],
      },
    });
    const result = parseBunLockPackageVersions(lock) as BunLockVersionMap;
    expect(result.get("lodash")).toBe("4.17.21");
    expect(result.get("react")).toBe("18.0.0");
  });

  test("handles scoped names by splitting on the last @", () => {
    const lock = JSON.stringify({
      lockfileVersion: 1,
      packages: {
        "@scope/foo": ["@scope/foo@1.2.3", {}, "<sha>"],
        "@types/node": ["@types/node@20.10.0", {}, "<sha>"],
      },
    });
    const result = parseBunLockPackageVersions(lock) as BunLockVersionMap;
    expect(result.get("@scope/foo")).toBe("1.2.3");
    expect(result.get("@types/node")).toBe("20.10.0");
  });

  test("returns empty map when packages field is absent", () => {
    const lock = JSON.stringify({ lockfileVersion: 1 });
    const result = parseBunLockPackageVersions(lock) as BunLockVersionMap;
    expect(result.size).toBe(0);
  });

  test("skips entries that do not follow name@version", () => {
    const lock = JSON.stringify({
      lockfileVersion: 1,
      packages: {
        ok: ["ok@1.0.0", {}, "<sha>"],
        // missing version segment
        weird: ["weird", {}, "<sha>"],
        // empty version after @
        emptyVersion: ["emptyVersion@", {}, "<sha>"],
        // not an array
        notAnArray: "huh",
      },
    });
    const result = parseBunLockPackageVersions(lock) as BunLockVersionMap;
    expect(result.get("ok")).toBe("1.0.0");
    expect(result.has("weird")).toBe(false);
    expect(result.has("emptyVersion")).toBe(false);
    expect(result.has("notAnArray")).toBe(false);
  });

  test("returns an error for malformed JSON", () => {
    const result = parseBunLockPackageVersions("{ not valid }");
    expect(result).toBeInstanceOf(Error);
  });
});

describe("computeExternalDependencyChanges", () => {
  const workspaces = [
    makeTestWorkspace({
      name: "a",
      externalDependencies: [
        { name: "lodash", dev: false },
        { name: "typescript", dev: true },
      ],
    }),
    makeTestWorkspace({
      name: "b",
      externalDependencies: [{ name: "react", dev: false }],
    }),
  ];

  test("emits no entries when versions are unchanged", () => {
    const lock = new Map([
      ["lodash", "4.17.21"],
      ["typescript", "5.0.0"],
      ["react", "18.0.0"],
    ]);
    const result = computeExternalDependencyChanges({
      workspaces,
      baseLock: lock,
      headLock: lock,
    });
    expect(result.size).toBe(0);
  });

  test("emits a change when a version moves", () => {
    const baseLock = new Map([
      ["lodash", "4.17.21"],
      ["typescript", "5.0.0"],
      ["react", "18.0.0"],
    ]);
    const headLock = new Map([
      ["lodash", "4.17.22"],
      ["typescript", "5.0.0"],
      ["react", "18.0.0"],
    ]);
    const result = computeExternalDependencyChanges({
      workspaces,
      baseLock,
      headLock,
    });
    expect(result.get("a")).toEqual([
      {
        name: "lodash",
        dev: false,
        baseVersion: "4.17.21",
        headVersion: "4.17.22",
      },
    ]);
    expect(result.has("b")).toBe(false);
  });

  test("emits an added (baseVersion=null) entry for new deps", () => {
    const baseLock = new Map<string, string>();
    const headLock = new Map([["lodash", "4.17.21"]]);
    const result = computeExternalDependencyChanges({
      workspaces: [workspaces[0]],
      baseLock,
      headLock,
    });
    expect(result.get("a")).toContainEqual({
      name: "lodash",
      dev: false,
      baseVersion: null,
      headVersion: "4.17.21",
    });
  });

  test("emits a removed (headVersion=null) entry for deleted deps", () => {
    const baseLock = new Map([
      ["lodash", "4.17.21"],
      ["typescript", "5.0.0"],
    ]);
    const headLock = new Map<string, string>();
    const result = computeExternalDependencyChanges({
      workspaces: [workspaces[0]],
      baseLock,
      headLock,
    });
    expect(result.get("a")).toContainEqual({
      name: "lodash",
      dev: false,
      baseVersion: "4.17.21",
      headVersion: null,
    });
    expect(result.get("a")).toContainEqual({
      name: "typescript",
      dev: true,
      baseVersion: "5.0.0",
      headVersion: null,
    });
  });

  test("preserves the dev flag from the workspace's externalDependencies entry", () => {
    const baseLock = new Map([["typescript", "5.0.0"]]);
    const headLock = new Map([["typescript", "5.1.0"]]);
    const result = computeExternalDependencyChanges({
      workspaces: [workspaces[0]],
      baseLock,
      headLock,
    });
    expect(result.get("a")).toEqual([
      {
        name: "typescript",
        dev: true,
        baseVersion: "5.0.0",
        headVersion: "5.1.0",
      },
    ]);
  });

  test("workspaces with no external deps produce no entries", () => {
    const empty = makeTestWorkspace({ name: "empty" });
    const result = computeExternalDependencyChanges({
      workspaces: [empty],
      baseLock: new Map(),
      headLock: new Map([["whatever", "1.0.0"]]),
    });
    expect(result.size).toBe(0);
  });
});
