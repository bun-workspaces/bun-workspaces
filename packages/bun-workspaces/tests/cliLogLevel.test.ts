import { test, describe } from "bun:test";
import { setupCliTest, assertOutputMatches } from "./util/cliTestUtils";
import { withWindowsPath } from "./util/windows";

describe("CLI Log Level", () => {
  test("Level is silent", async () => {
    const { run } = setupCliTest({ testProject: "oneWorkspace" });

    assertOutputMatches(
      (await run("--log-level=silent", "ls")).stdoutAndErr.raw,
      `Workspace: application-a
 - Aliases: 
 - Path: ${withWindowsPath("applications/applicationA")}
 - Glob Match: applications/*
 - Scripts: a-workspaces, all-workspaces, application-a`,
    );

    assertOutputMatches(
      (await run("--log-level=silent", "ls", "--json")).stdoutAndErr.raw,
      JSON.stringify([
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
      ]),
    );

    assertOutputMatches(
      (await run("--log-level=silent", "ls", "--name-only")).stdoutAndErr.raw,
      `application-a`,
    );

    assertOutputMatches(
      (await run("--log-level=silent", "info", "application-a")).stdoutAndErr
        .raw,
      `Workspace: application-a
 - Aliases: 
 - Path: ${withWindowsPath("applications/applicationA")}
 - Glob Match: applications/*
 - Scripts: a-workspaces, all-workspaces, application-a`,
    );

    assertOutputMatches(
      (await run("--log-level=silent", "info", "application-a", "--json"))
        .stdoutAndErr.raw,
      JSON.stringify({
        name: "application-a",
        isRoot: false,
        matchPattern: "applications/*",
        path: withWindowsPath("applications/applicationA"),
        scripts: ["a-workspaces", "all-workspaces", "application-a"],
        aliases: [],
        dependencies: [],
        dependents: [],
      }),
    );

    assertOutputMatches(
      (await run("--log-level=silent", "info", "does-not-exist")).stdoutAndErr
        .raw,
      /^$/,
    );

    assertOutputMatches(
      (await run("--log-level=silent", "list-scripts")).stdoutAndErr.raw,
      `Script: a-workspaces
 - application-a
Script: all-workspaces
 - application-a
Script: application-a
 - application-a`,
    );

    assertOutputMatches(
      (await run("--log-level=silent", "list-scripts", "--json")).stdoutAndErr
        .raw,
      JSON.stringify([
        {
          name: "a-workspaces",
          workspaces: ["application-a"],
        },
        {
          name: "all-workspaces",
          workspaces: ["application-a"],
        },
        {
          name: "application-a",
          workspaces: ["application-a"],
        },
      ]),
    );

    assertOutputMatches(
      (await run("--log-level=silent", "list-scripts", "--name-only"))
        .stdoutAndErr.raw,
      `a-workspaces
all-workspaces
application-a`,
    );

    assertOutputMatches(
      (await run("--log-level=silent", "script-info", "all-workspaces"))
        .stdoutAndErr.raw,
      `Script: all-workspaces
 - application-a`,
    );

    assertOutputMatches(
      (
        await run(
          "--log-level=silent",
          "script-info",
          "all-workspaces",
          "--json",
        )
      ).stdoutAndErr.raw,
      JSON.stringify({
        name: "all-workspaces",
        workspaces: ["application-a"],
      }),
    );

    assertOutputMatches(
      (await run("--log-level=silent", "script-info", "does-not-exist"))
        .stdoutAndErr.raw,
      /^$/,
    );

    assertOutputMatches(
      (await run("--log-level=silent", "run-script", "all-workspaces"))
        .stdoutAndErr.sanitized,
      /^$/,
    );

    assertOutputMatches(
      (await run("--log-level=silent", "run-script", "does-not-exist"))
        .stdoutAndErr.raw,
      /^$/,
    );
  });

  test("Level is error", async () => {
    const { run } = setupCliTest({ testProject: "oneWorkspace" });

    assertOutputMatches(
      (await run("--log-level=error", "ls")).stdoutAndErr.raw,
      `Workspace: application-a
 - Aliases: 
 - Path: ${withWindowsPath("applications/applicationA")}
 - Glob Match: applications/*
 - Scripts: a-workspaces, all-workspaces, application-a`,
    );

    assertOutputMatches(
      (await run("--log-level=error", "ls", "--json")).stdoutAndErr.raw,
      JSON.stringify([
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
      ]),
    );

    assertOutputMatches(
      (await run("--log-level=error", "ls", "--name-only")).stdoutAndErr.raw,
      `application-a`,
    );

    assertOutputMatches(
      (await run("--log-level=error", "info", "application-a")).stdoutAndErr
        .raw,
      `Workspace: application-a
 - Aliases: 
 - Path: ${withWindowsPath("applications/applicationA")}
 - Glob Match: applications/*
 - Scripts: a-workspaces, all-workspaces, application-a`,
    );

    assertOutputMatches(
      (await run("--log-level=error", "info", "application-a", "--json"))
        .stdoutAndErr.raw,
      JSON.stringify({
        name: "application-a",
        isRoot: false,
        matchPattern: "applications/*",
        path: withWindowsPath("applications/applicationA"),
        scripts: ["a-workspaces", "all-workspaces", "application-a"],
        aliases: [],
        dependencies: [],
        dependents: [],
      }),
    );

    assertOutputMatches(
      (await run("--log-level=error", "info", "does-not-exist")).stdoutAndErr
        .sanitized,
      'Workspace "does-not-exist" not found',
    );

    assertOutputMatches(
      (await run("--log-level=error", "list-scripts")).stdoutAndErr.raw,
      `Script: a-workspaces
 - application-a
Script: all-workspaces
 - application-a
Script: application-a
 - application-a`,
    );

    assertOutputMatches(
      (await run("--log-level=error", "list-scripts", "--json")).stdoutAndErr
        .raw,
      JSON.stringify([
        {
          name: "a-workspaces",
          workspaces: ["application-a"],
        },
        {
          name: "all-workspaces",
          workspaces: ["application-a"],
        },
        {
          name: "application-a",
          workspaces: ["application-a"],
        },
      ]),
    );

    assertOutputMatches(
      (await run("--log-level=error", "list-scripts", "--name-only"))
        .stdoutAndErr.raw,
      `a-workspaces
all-workspaces
application-a`,
    );

    assertOutputMatches(
      (await run("--log-level=error", "script-info", "all-workspaces"))
        .stdoutAndErr.raw,
      `Script: all-workspaces
 - application-a`,
    );

    assertOutputMatches(
      (
        await run(
          "--log-level=error",
          "script-info",
          "all-workspaces",
          "--json",
        )
      ).stdoutAndErr.raw,
      JSON.stringify({
        name: "all-workspaces",
        workspaces: ["application-a"],
      }),
    );

    assertOutputMatches(
      (await run("--log-level=error", "script-info", "does-not-exist"))
        .stdoutAndErr.sanitized,
      'Script not found: "does-not-exist"',
    );

    assertOutputMatches(
      (await run("--log-level=error", "run-script", "all-workspaces"))
        .stdoutAndErr.sanitized,
      /^\[application-a:all-workspaces\] script for all workspaces$/,
    );

    assertOutputMatches(
      (await run("--log-level=error", "run-script", "does-not-exist"))
        .stdoutAndErr.sanitized,
      'No matching workspaces found with script "does-not-exist"',
    );
  });
});
