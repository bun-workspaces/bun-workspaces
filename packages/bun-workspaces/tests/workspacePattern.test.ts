import { expect, test, describe } from "bun:test";
import {
  matchWorkspacesByPatterns,
  parseWorkspacePattern,
} from "../src/workspaces/workspacePattern";

describe("Test workspace pattern", () => {
  test("parseWorkspacePattern", () => {
    expect(parseWorkspacePattern("")).toEqual({
      target: "default",
      value: "",
      isNegated: false,
    });

    expect(parseWorkspacePattern("*")).toEqual({
      target: "default",
      value: "*",
      isNegated: false,
    });

    expect(parseWorkspacePattern("!*")).toEqual({
      target: "default",
      value: "*",
      isNegated: true,
    });

    expect(parseWorkspacePattern("my-workspace")).toEqual({
      target: "default",
      value: "my-workspace",
      isNegated: false,
    });

    expect(parseWorkspacePattern("!my-workspace")).toEqual({
      target: "default",
      value: "my-workspace",
      isNegated: true,
    });

    expect(parseWorkspacePattern("src/**/*")).toEqual({
      target: "default",
      value: "src/**/*",
      isNegated: false,
    });

    expect(parseWorkspacePattern("!src/**/*")).toEqual({
      target: "default",
      value: "src/**/*",
      isNegated: true,
    });

    expect(parseWorkspacePattern("path:src/**/*")).toEqual({
      target: "path",
      value: "src/**/*",
      isNegated: false,
    });

    expect(parseWorkspacePattern("!path:src/**/*")).toEqual({
      target: "path",
      value: "src/**/*",
      isNegated: true,
    });

    expect(parseWorkspacePattern("name:my-workspace")).toEqual({
      target: "name",
      value: "my-workspace",
      isNegated: false,
    });

    expect(parseWorkspacePattern("!name:my-workspace")).toEqual({
      target: "name",
      value: "my-workspace",
      isNegated: true,
    });

    expect(parseWorkspacePattern("alias:my-alias")).toEqual({
      target: "alias",
      value: "my-alias",
      isNegated: false,
    });

    expect(parseWorkspacePattern("!alias:my-alias")).toEqual({
      target: "alias",
      value: "my-alias",
      isNegated: true,
    });
  });

  test("matchWorkspacesByPatterns", () => {
    const workspaces = {
      a: {
        name: "workspace-a",
        isRoot: false,
        matchPattern: "",
        path: "packages/a",
        scripts: [],
        aliases: ["wsa"],
        dependsOn: [],
        dependents: [],
      },
      b: {
        name: "workspace-b",
        isRoot: false,
        matchPattern: "",
        path: "packages/b",
        scripts: [],
        aliases: ["wsb"],
        dependsOn: [],
        dependents: [],
      },
      c: {
        name: "workspace-c",
        isRoot: false,
        matchPattern: "",
        path: "packages/nested/c",
        scripts: [],
        aliases: ["wsc"],
        dependsOn: [],
        dependents: [],
      },
      d: {
        name: "workspace-d",
        isRoot: false,
        matchPattern: "",
        path: "packages/nested/d",
        scripts: [],
        aliases: ["wsd"],
        dependsOn: [],
        dependents: [],
      },
    };

    const workspacesArray = Object.values(workspaces);

    expect(matchWorkspacesByPatterns(["wsd"], workspacesArray)).toEqual([
      workspaces.d,
    ]);

    expect(
      matchWorkspacesByPatterns(["!wsd", "workspace-*"], workspacesArray),
    ).toEqual([workspaces.a, workspaces.b, workspaces.c]);

    expect(matchWorkspacesByPatterns(["*c"], workspacesArray)).toEqual([
      workspaces.c,
    ]);

    expect(matchWorkspacesByPatterns(["*"], workspacesArray)).toEqual([
      workspaces.a,
      workspaces.b,
      workspaces.c,
      workspaces.d,
    ]);

    expect(matchWorkspacesByPatterns(["!*"], workspacesArray)).toEqual([]);

    expect(
      matchWorkspacesByPatterns(["name:workspace-a"], workspacesArray),
    ).toEqual([workspaces.a]);

    expect(
      matchWorkspacesByPatterns(["!name:workspace-a", "*"], workspacesArray),
    ).toEqual([workspaces.b, workspaces.c, workspaces.d]);

    expect(matchWorkspacesByPatterns(["alias:wsa"], workspacesArray)).toEqual([
      workspaces.a,
    ]);

    expect(
      matchWorkspacesByPatterns(["!alias:wsa", "*"], workspacesArray),
    ).toEqual([workspaces.b, workspaces.c, workspaces.d]);

    expect(
      matchWorkspacesByPatterns(["path:packages/a"], workspacesArray),
    ).toEqual([workspaces.a]);

    expect(
      matchWorkspacesByPatterns(["path:packages/*"], workspacesArray),
    ).toEqual([workspaces.a, workspaces.b]);

    expect(
      matchWorkspacesByPatterns(["path:packages/**/*"], workspacesArray),
    ).toEqual([workspaces.a, workspaces.b, workspaces.c, workspaces.d]);

    expect(
      matchWorkspacesByPatterns(["path:packages/**/c"], workspacesArray),
    ).toEqual([workspaces.c]);

    expect(
      matchWorkspacesByPatterns(
        ["!alias:wsc", "path:packages/nested/**"],
        workspacesArray,
      ),
    ).toEqual([workspaces.d]);

    expect(
      matchWorkspacesByPatterns(
        ["!alias:wsc", "path:packages/nested/**", "name:workspace-*"],
        workspacesArray,
      ),
    ).toEqual([workspaces.a, workspaces.b, workspaces.d]);

    expect(
      matchWorkspacesByPatterns(
        [
          "!alias:wsb",
          "path:packages/nested/**",
          "name:workspace-*",
          "!alias:wsd",
        ],
        workspacesArray,
      ),
    ).toEqual([workspaces.a, workspaces.c]);

    expect(matchWorkspacesByPatterns(["alias:w*"], workspacesArray)).toEqual([
      workspaces.a,
      workspaces.b,
      workspaces.c,
      workspaces.d,
    ]);

    expect(
      matchWorkspacesByPatterns(["!path:**/*/b", "alias:ws*"], workspacesArray),
    ).toEqual([workspaces.a, workspaces.c, workspaces.d]);
  });
});
