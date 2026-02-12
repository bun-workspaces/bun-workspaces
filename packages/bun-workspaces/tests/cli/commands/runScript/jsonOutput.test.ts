import fs from "fs";
import path from "path";
import { test, expect, describe, beforeAll } from "bun:test";
import { getUserEnvVar } from "../../../../src/config/userEnvVars";
import { createRawPattern } from "../../../../src/internal/core";
import {
  getProjectRoot,
  type TestProjectName,
} from "../../../fixtures/testProjects";
import { setupCliTest, assertOutputMatches } from "../../../util/cliTestUtils";
import { withWindowsPath } from "../../../util/windows";

const TEST_OUTPUT_DIR = path.resolve(__dirname, "test-output");

describe("CLI Run Script", () => {
  beforeAll(() => {
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.rmSync(TEST_OUTPUT_DIR, { recursive: true });
    }
  });

  test("JSON output - errors with output path", async () => {
    const { run } = setupCliTest({
      testProject: "simple1",
    });

    fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });

    const result = await run(
      "run-script",
      "all-workspaces",
      `--json-outfile=${TEST_OUTPUT_DIR}`,
    );
    expect(result.exitCode).toBe(1);
    assertOutputMatches(
      result.stderr.sanitizedCompactLines,
      `Given JSON output file path "${TEST_OUTPUT_DIR}" is an existing directory`,
    );

    fs.writeFileSync(TEST_OUTPUT_DIR + "/test-file.txt", "test file");
    const result2 = await run(
      "run-script",
      "all-workspaces",
      "--json-outfile",
      TEST_OUTPUT_DIR + "/test-file.txt/test-file.json",
    );
    expect(result2.exitCode).toBe(1);
    assertOutputMatches(
      result2.stderr.sanitizedCompactLines,
      `Given JSON output file directory "${withWindowsPath(`${TEST_OUTPUT_DIR}/test-file.txt`)}" is an existing file`,
    );

    const result3 = await run(
      "run-script",
      "all-workspaces",
      "--json-outfile",
      TEST_OUTPUT_DIR + "/test-file.txt/something/else.json",
    );
    expect(result3.exitCode).toBe(1);
    assertOutputMatches(
      result3.stderr.sanitizedCompactLines,
      new RegExp(
        createRawPattern(
          `Failed to create JSON output file directory "${withWindowsPath(`${TEST_OUTPUT_DIR}/test-file.txt/something`)}":`,
        ),
      ),
    );
  });

  const runAndGetJsonOutput = async (
    testProject: TestProjectName,
    outputPath: string,
    ...args: string[]
  ) => {
    const { run } = setupCliTest({ testProject });
    const fullOutputPath = path.resolve(TEST_OUTPUT_DIR, outputPath);
    const result = await run(
      "run-script",
      ...args,
      "--json-outfile",
      fullOutputPath,
    );
    return {
      result,
      json: JSON.parse(fs.readFileSync(fullOutputPath, "utf8")),
    };
  };

  test("JSON output file - all success", async () => {
    const { json: jsonOutput1 } = await runAndGetJsonOutput(
      "simple1",
      "test-simple1.json",
      "all-workspaces",
      '--args="test args"',
    );
    expect(jsonOutput1).toEqual({
      totalCount: 4,
      successCount: 4,
      failureCount: 0,
      allSuccess: true,
      startTimeISO: expect.any(String),
      endTimeISO: expect.any(String),
      durationMs: expect.any(Number),
      scriptResults: [
        {
          metadata: {
            workspace: {
              name: "application-1a",
              isRoot: false,
              matchPattern: "applications/*",
              path: withWindowsPath("applications/applicationA"),
              aliases: ["deprecated_appA"],
              scripts: ["a-workspaces", "all-workspaces", "application-a"],
              dependencies: [],
              dependents: [],
            },
          },
          success: true,
          signal: null,
          exitCode: 0,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
        },
        {
          metadata: {
            workspace: {
              name: "application-1b",
              isRoot: false,
              matchPattern: "applications/*",
              path: withWindowsPath("applications/applicationB"),
              aliases: ["deprecated_appB"],
              scripts: ["all-workspaces", "application-b", "b-workspaces"],
              dependencies: [],
              dependents: [],
            },
          },
          success: true,
          signal: null,
          exitCode: 0,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
        },
        {
          metadata: {
            workspace: {
              name: "library-1a",
              isRoot: false,
              matchPattern: "libraries/*",
              path: withWindowsPath("libraries/libraryA"),
              aliases: ["deprecated_libA"],
              scripts: ["a-workspaces", "all-workspaces", "library-a"],
              dependencies: [],
              dependents: [],
            },
          },
          success: true,
          signal: null,
          exitCode: 0,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
        },
        {
          metadata: {
            workspace: {
              name: "library-1b",
              isRoot: false,
              matchPattern: "libraries/*",
              path: withWindowsPath("libraries/libraryB"),
              aliases: ["deprecated_libB"],
              scripts: ["all-workspaces", "b-workspaces", "library-b"],
              dependencies: [],
              dependents: [],
            },
          },
          success: true,
          signal: null,
          exitCode: 0,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
        },
      ],
    });
    for (const { startTimeISO, endTimeISO, durationMs } of [
      jsonOutput1,
      ...jsonOutput1.scriptResults,
    ]) {
      expect(startTimeISO).toStartWith(new Date().toISOString().slice(0, 10));
      expect(endTimeISO).toStartWith(new Date().toISOString().slice(0, 10));
      expect(durationMs).toBe(
        new Date(endTimeISO).getTime() - new Date(startTimeISO).getTime(),
      );
    }

    const { json: jsonOutput2 } = await runAndGetJsonOutput(
      "simple1",
      "test-simple2.json",
      "a-workspaces",
      "--args=my-args",
    );
    expect(jsonOutput2).toEqual({
      totalCount: 2,
      successCount: 2,
      failureCount: 0,
      allSuccess: true,
      startTimeISO: expect.any(String),
      endTimeISO: expect.any(String),
      durationMs: expect.any(Number),
      scriptResults: [
        {
          metadata: {
            workspace: {
              name: "application-1a",
              isRoot: false,
              matchPattern: "applications/*",
              path: withWindowsPath("applications/applicationA"),
              aliases: ["deprecated_appA"],
              scripts: ["a-workspaces", "all-workspaces", "application-a"],
              dependencies: [],
              dependents: [],
            },
          },
          success: true,
          signal: null,
          exitCode: 0,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
        },
        {
          metadata: {
            workspace: {
              name: "library-1a",
              isRoot: false,
              matchPattern: "libraries/*",
              path: withWindowsPath("libraries/libraryA"),
              aliases: ["deprecated_libA"],
              scripts: ["a-workspaces", "all-workspaces", "library-a"],
              dependencies: [],
              dependents: [],
            },
          },
          success: true,
          signal: null,
          exitCode: 0,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
        },
      ],
    });

    for (const { startTimeISO, endTimeISO, durationMs } of [
      jsonOutput2,
      ...jsonOutput2.scriptResults,
    ]) {
      expect(startTimeISO).toStartWith(new Date().toISOString().slice(0, 10));
      expect(endTimeISO).toStartWith(new Date().toISOString().slice(0, 10));
      expect(durationMs).toBe(
        new Date(endTimeISO).getTime() - new Date(startTimeISO).getTime(),
      );
    }

    const { json: jsonOutput3 } = await runAndGetJsonOutput(
      "simple1",
      "test-simple3.json",
      "b-workspaces",
      "library*",
      "--parallel",
    );
    expect(jsonOutput3).toEqual({
      totalCount: 1,
      successCount: 1,
      failureCount: 0,
      allSuccess: true,
      startTimeISO: expect.any(String),
      endTimeISO: expect.any(String),
      durationMs: expect.any(Number),
      scriptResults: [
        {
          metadata: {
            workspace: {
              name: "library-1b",
              isRoot: false,
              matchPattern: "libraries/*",
              path: withWindowsPath("libraries/libraryB"),
              scripts: ["all-workspaces", "b-workspaces", "library-b"],
              aliases: ["deprecated_libB"],
              dependencies: [],
              dependents: [],
            },
          },
          signal: null,
          success: true,
          exitCode: 0,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
        },
      ],
    });

    for (const { startTimeISO, endTimeISO, durationMs } of [
      jsonOutput3,
      ...jsonOutput3.scriptResults,
    ]) {
      expect(startTimeISO).toStartWith(new Date().toISOString().slice(0, 10));
      expect(endTimeISO).toStartWith(new Date().toISOString().slice(0, 10));
      expect(durationMs).toBe(
        new Date(endTimeISO).getTime() - new Date(startTimeISO).getTime(),
      );
    }
  });

  test("JSON output file - mixed results", async () => {
    const { json } = await runAndGetJsonOutput(
      "runScriptWithFailures",
      "test-mixed-results.json",
      "test-exit",
      "--parallel",
    );

    expect(json).toEqual({
      totalCount: 4,
      successCount: 2,
      failureCount: 2,
      allSuccess: false,
      startTimeISO: expect.any(String),
      endTimeISO: expect.any(String),
      durationMs: expect.any(Number),
      scriptResults: [
        {
          metadata: {
            workspace: {
              name: "fail1",
              isRoot: false,
              matchPattern: "packages/**/*",
              path: withWindowsPath("packages/fail1"),
              aliases: [],
              scripts: ["test-exit"],
              dependencies: [],
              dependents: [],
            },
          },
          signal: null,
          success: false,
          exitCode: 1,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
        },
        {
          metadata: {
            workspace: {
              name: "fail2",
              isRoot: false,
              matchPattern: "packages/**/*",
              path: withWindowsPath("packages/fail2"),
              aliases: [],
              scripts: ["test-exit"],
              dependencies: [],
              dependents: [],
            },
          },
          signal: null,
          success: false,
          exitCode: 2,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
        },
        {
          metadata: {
            workspace: {
              name: "success1",
              isRoot: false,
              matchPattern: "packages/**/*",
              path: withWindowsPath("packages/success1"),
              aliases: [],
              scripts: ["test-exit"],
              dependencies: [],
              dependents: [],
            },
          },
          signal: null,
          success: true,
          exitCode: 0,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
        },
        {
          metadata: {
            workspace: {
              name: "success2",
              isRoot: false,
              matchPattern: "packages/**/*",
              path: withWindowsPath("packages/success2"),
              aliases: [],
              scripts: ["test-exit"],
              dependencies: [],
              dependents: [],
            },
          },
          signal: null,
          success: true,
          exitCode: 0,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
        },
      ],
    });

    for (const { startTimeISO, endTimeISO, durationMs } of [
      json,
      ...json.scriptResults,
    ]) {
      expect(startTimeISO).toStartWith(new Date().toISOString().slice(0, 10));
      expect(endTimeISO).toStartWith(new Date().toISOString().slice(0, 10));
      expect(durationMs).toBe(
        new Date(endTimeISO).getTime() - new Date(startTimeISO).getTime(),
      );
    }
  });

  test("JSON output file - relative path with --cwd global option", async () => {
    const { run } = setupCliTest({
      testProject: "simple1",
    });

    const result = await run(
      "--cwd",
      getProjectRoot("simple1"),
      "run-script",
      "application-a",
      "--args=test-args",
      "--json-outfile",
      "test-output/results.json", // for gitignore
    );

    expect(result.exitCode).toBe(0);
    expect(
      JSON.parse(
        fs.readFileSync(
          path.resolve(getProjectRoot("simple1"), "test-output/results.json"),
          "utf8",
        ),
      ),
    ).toEqual({
      totalCount: 1,
      successCount: 1,
      failureCount: 0,
      allSuccess: true,
      startTimeISO: expect.any(String),
      endTimeISO: expect.any(String),
      durationMs: expect.any(Number),
      scriptResults: [
        {
          metadata: {
            workspace: {
              name: "application-1a",
              isRoot: false,
              matchPattern: "applications/*",
              path: withWindowsPath("applications/applicationA"),
              aliases: ["deprecated_appA"],
              scripts: ["a-workspaces", "all-workspaces", "application-a"],
              dependencies: [],
              dependents: [],
            },
          },
          success: true,
          signal: null,
          exitCode: 0,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
        },
      ],
    });

    const resultShort = await run(
      "--cwd",
      getProjectRoot("simple1"),
      "run-script",
      "application-a",
      "-a test-args",
      "-j",
      "test-output/results-short.json", // for gitignore
    );

    expect(resultShort.exitCode).toBe(0);
    expect(
      JSON.parse(
        fs.readFileSync(
          path.resolve(
            getProjectRoot("simple1"),
            "test-output/results-short.json",
          ),
          "utf8",
        ),
      ),
    ).toEqual({
      totalCount: 1,
      successCount: 1,
      failureCount: 0,
      allSuccess: true,
      startTimeISO: expect.any(String),
      endTimeISO: expect.any(String),
      durationMs: expect.any(Number),
      scriptResults: [
        {
          metadata: {
            workspace: {
              name: "application-1a",
              isRoot: false,
              matchPattern: "applications/*",
              path: withWindowsPath("applications/applicationA"),
              aliases: ["deprecated_appA"],
              scripts: ["a-workspaces", "all-workspaces", "application-a"],
              dependencies: [],
              dependents: [],
            },
          },
          success: true,
          signal: null,
          exitCode: 0,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
        },
      ],
    });
  });
});
