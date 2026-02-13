import { test, expect, describe } from "bun:test";
import { getProjectRoot } from "../../fixtures/testProjects";
import {
  setupCliTest,
  assertOutputMatches,
  listCommandAndAliases,
} from "../../util/cliTestUtils";
import { withWindowsPath } from "../../util/windows";

const EXPECTED_SCRIPTS_JSON_SIMPLE1 = [
  { name: "a-workspaces", workspaces: ["application-1a", "library-1a"] },
  {
    name: "all-workspaces",
    workspaces: [
      "application-1a",
      "application-1b",
      "library-1a",
      "library-1b",
    ],
  },
  { name: "application-a", workspaces: ["application-1a"] },
  { name: "application-b", workspaces: ["application-1b"] },
  { name: "b-workspaces", workspaces: ["application-1b", "library-1b"] },
  { name: "library-a", workspaces: ["library-1a"] },
  { name: "library-b", workspaces: ["library-1b"] },
];

const PLAIN_OUTPUT_SIMPLE1 = `Script: a-workspaces
 - application-1a
 - library-1a
Script: all-workspaces
 - application-1a
 - application-1b
 - library-1a
 - library-1b
Script: application-a
 - application-1a
Script: application-b
 - application-1b
Script: b-workspaces
 - application-1b
 - library-1b
Script: library-a
 - library-1a
Script: library-b
 - library-1b`;

describe("List Scripts", () => {
  describe("output format", () => {
    test.each(listCommandAndAliases("listScripts"))(
      "plain output lists scripts with workspaces: %s",
      async (command) => {
        const { run } = setupCliTest({ testProject: "simple1" });
        const result = await run(command);
        assertOutputMatches(result.stdout.raw, PLAIN_OUTPUT_SIMPLE1);
        expect(result.stderr.raw).toBeEmpty();
      },
    );

    test("--json outputs script list as JSON", async () => {
      const { run } = setupCliTest({ testProject: "simple1" });
      const result = await run("ls-scripts", "--json");
      expect(result.stderr.raw).toBeEmpty();
      expect(result.exitCode).toBe(0);
      assertOutputMatches(
        result.stdout.raw,
        JSON.stringify(EXPECTED_SCRIPTS_JSON_SIMPLE1),
      );
    });

    test("-j outputs script list as JSON", async () => {
      const { run } = setupCliTest({ testProject: "simple1" });
      const result = await run("ls-scripts", "-j");
      expect(result.stderr.raw).toBeEmpty();
      expect(result.exitCode).toBe(0);
      assertOutputMatches(
        result.stdout.raw,
        JSON.stringify(EXPECTED_SCRIPTS_JSON_SIMPLE1),
      );
    });

    test("--json --pretty outputs pretty-printed JSON", async () => {
      const { run } = setupCliTest({ testProject: "simple1" });
      const result = await run("ls-scripts", "--json", "--pretty");
      expect(result.stderr.raw).toBeEmpty();
      expect(result.exitCode).toBe(0);
      assertOutputMatches(
        result.stdout.raw,
        JSON.stringify(EXPECTED_SCRIPTS_JSON_SIMPLE1, null, 2),
      );
    });

    test("-j -p outputs pretty-printed JSON", async () => {
      const { run } = setupCliTest({ testProject: "simple1" });
      const result = await run("ls-scripts", "-j", "-p");
      expect(result.stderr.raw).toBeEmpty();
      expect(result.exitCode).toBe(0);
      assertOutputMatches(
        result.stdout.raw,
        JSON.stringify(EXPECTED_SCRIPTS_JSON_SIMPLE1, null, 2),
      );
    });

    test("--name-only --json outputs script names only", async () => {
      const { run } = setupCliTest({ testProject: "simple1" });
      const result = await run("ls-scripts", "--name-only", "--json");
      expect(result.stderr.raw).toBeEmpty();
      expect(result.exitCode).toBe(0);
      assertOutputMatches(
        result.stdout.raw,
        JSON.stringify(EXPECTED_SCRIPTS_JSON_SIMPLE1.map(({ name }) => name)),
      );
    });

    test("-n -j outputs script names only", async () => {
      const { run } = setupCliTest({ testProject: "simple1" });
      const result = await run("ls-scripts", "-n", "-j");
      expect(result.stderr.raw).toBeEmpty();
      expect(result.exitCode).toBe(0);
      assertOutputMatches(
        result.stdout.raw,
        JSON.stringify(EXPECTED_SCRIPTS_JSON_SIMPLE1.map(({ name }) => name)),
      );
    });

    test("--name-only --json --pretty outputs pretty script names", async () => {
      const { run } = setupCliTest({ testProject: "simple1" });
      const result = await run(
        "ls-scripts",
        "--name-only",
        "--json",
        "--pretty",
      );
      expect(result.stderr.raw).toBeEmpty();
      expect(result.exitCode).toBe(0);
      assertOutputMatches(
        result.stdout.raw,
        JSON.stringify(
          EXPECTED_SCRIPTS_JSON_SIMPLE1.map(({ name }) => name),
          null,
          2,
        ),
      );
    });

    test("-n -j -p outputs pretty script names", async () => {
      const { run } = setupCliTest({ testProject: "simple1" });
      const result = await run("ls-scripts", "-n", "-j", "-p");
      expect(result.stderr.raw).toBeEmpty();
      expect(result.exitCode).toBe(0);
      assertOutputMatches(
        result.stdout.raw,
        JSON.stringify(
          EXPECTED_SCRIPTS_JSON_SIMPLE1.map(({ name }) => name),
          null,
          2,
        ),
      );
    });
  });

  describe("project states", () => {
    test("exits with error when project has no bun.lock", async () => {
      const { run } = setupCliTest({ testProject: "emptyWorkspaces" });
      const result = await run("ls-scripts");
      expect(result.stdout.raw).toBeEmpty();
      expect(result.exitCode).toBe(1);
      assertOutputMatches(
        result.stderr.sanitizedCompactLines,
        `No bun.lock found at ${withWindowsPath(getProjectRoot("emptyWorkspaces"))}. Check that this is the directory of your project and that you've ran 'bun install'. ` +
          "If you have ran 'bun install', you may simply have no workspaces or dependencies in your project.",
      );
    });

    test("outputs 'No scripts found' when project has no scripts", async () => {
      const { run } = setupCliTest({ testProject: "emptyScripts" });
      const result = await run("ls-scripts");
      expect(result.stderr.raw).toBeEmpty();
      expect(result.exitCode).toBe(0);
      assertOutputMatches(result.stdout.raw, "No scripts found");
    });
  });

  test("exits with error for invalid project", async () => {
    const { run } = setupCliTest({
      testProject: "invalidBadJson",
    });

    const result = await run("ls-scripts");
    expect(result.exitCode).toBe(1);
    assertOutputMatches(
      result.stderr.sanitizedCompactLines,
      `No bun.lock found at ${withWindowsPath(getProjectRoot("invalidBadJson"))}. Check that this is the directory of your project and that you've ran 'bun install'. ` +
        "If you have ran 'bun install', you may simply have no workspaces or dependencies in your project.",
    );
  });
});
