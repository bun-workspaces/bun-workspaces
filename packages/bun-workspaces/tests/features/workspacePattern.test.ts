import { expect, test, describe } from "bun:test";
import {
  matchWorkspacesByPatterns,
  parseWorkspacePattern,
} from "../../src/workspaces/workspacePattern";
import { makeTestWorkspace } from "../util/testData";

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
      a: makeTestWorkspace({
        name: "workspace-a",
        path: "packages/a",
        aliases: ["wsa"],
      }),
      b: makeTestWorkspace({
        name: "workspace-b",
        path: "packages/b",
        aliases: ["wsb"],
      }),
      c: makeTestWorkspace({
        name: "workspace-c",
        path: "packages/nested/c",
        aliases: ["wsc"],
      }),
      d: makeTestWorkspace({
        name: "workspace-d",
        path: "packages/nested/d",
        aliases: ["wsd"],
      }),
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
