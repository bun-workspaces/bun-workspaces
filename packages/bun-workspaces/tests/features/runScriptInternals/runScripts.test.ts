import { randomUUID } from "crypto";
import fs from "fs";
import { availableParallelism } from "os";
import path from "path";
import { test, expect, describe, afterAll } from "bun:test";
import { getUserEnvVarName } from "../../../src/config/userEnvVars";
import { IS_WINDOWS } from "../../../src/internal/core";
import {
  runScripts,
  type RunScriptExit,
  type RunScriptsSummary,
} from "../../../src/runScript";

const makeScriptExit = <Metadata extends object = object>(
  overrides: Partial<RunScriptExit<Metadata>> = {},
): RunScriptExit<Metadata> => ({
  exitCode: 0,
  success: true,
  startTimeISO: expect.any(String),
  endTimeISO: expect.any(String),
  durationMs: expect.any(Number),
  signal: null,
  metadata: {} as Metadata,
  ...overrides,
});

const makeExitSummary = <Metadata extends object = object>(
  overrides: Partial<RunScriptsSummary<Metadata>> = {},
): RunScriptsSummary<Metadata> => ({
  totalCount: 1,
  successCount: 1,
  failureCount: 0,
  allSuccess: true,
  startTimeISO: expect.any(String),
  endTimeISO: expect.any(String),
  durationMs: expect.any(Number),
  scriptResults: [],
  ...overrides,
});

const originalParallelMaxDefault =
  process.env[getUserEnvVarName("parallelMaxDefault")];

afterAll(() => {
  process.env[getUserEnvVarName("parallelMaxDefault")] =
    originalParallelMaxDefault;
});

describe("Run Multiple Scripts", () => {
  test("Run Scripts - simple series", async () => {
    const result = await runScripts({
      scripts: [
        {
          metadata: {
            name: "test-script name 1",
          },
          scriptCommand: {
            command: "echo test-script 1",
            workingDirectory: "",
          },
          env: {},
        },
        {
          metadata: {
            name: "test-script name 2",
          },
          scriptCommand: {
            command: "echo test-script 2",
            workingDirectory: "",
          },
          env: {},
        },
      ],
      parallel: false,
    });

    let i = 0;
    for await (const { metadata, chunk } of result.processOutput.text()) {
      expect(metadata.name).toBe(`test-script name ${i + 1}`);
      expect(metadata.streamName).toBe("stdout");
      expect(chunk.trim()).toMatch(`test-script ${i + 1}`);
      i++;
    }

    const summary = await result.summary;
    expect(summary).toEqual(
      makeExitSummary({
        totalCount: 2,
        successCount: 2,
        scriptResults: [
          makeScriptExit({ metadata: { name: "test-script name 1" } }),
          makeScriptExit({ metadata: { name: "test-script name 2" } }),
        ],
      }),
    );
  });

  test("Run Scripts - stdout and stderr - deprecated output", async () => {
    const result = await runScripts({
      scripts: [
        {
          metadata: { name: "test-script name 1" },
          scriptCommand: {
            command: IS_WINDOWS
              ? `echo test-script 1 && echo test-script 2 1>&2`
              : "echo 'test-script 1' && echo 'test-script 2' >&2",
            workingDirectory: "",
          },
          env: {},
        },
      ],
      parallel: false,
    });

    let outputCount = 0;
    for await (const { outputChunk, scriptMetadata } of result.output) {
      expect(scriptMetadata.name).toBe("test-script name 1");
      expect(outputChunk.streamName).toBe(
        outputCount === 1 ? "stderr" : "stdout",
      );
      expect(outputChunk.decode()).toMatch(`test-script ${outputCount + 1}`);
      outputCount++;
    }
    expect(outputCount).toBe(2);
  });

  test("Run Scripts - stdout and stderr - process output (bytes)", async () => {
    const result = await runScripts({
      scripts: [
        {
          metadata: { name: "test-script name 1" },
          scriptCommand: {
            command: IS_WINDOWS
              ? `echo test-script 1 && echo test-script 2 1>&2`
              : "echo 'test-script 1' && echo 'test-script 2' >&2",
            workingDirectory: "",
          },
          env: {},
        },
      ],
      parallel: false,
    });

    let outputCount = 0;
    for await (const { metadata, chunk } of result.processOutput.bytes()) {
      expect(metadata.name).toBe("test-script name 1");
      expect(metadata.streamName).toBe(outputCount === 1 ? "stderr" : "stdout");
      expect(new TextDecoder().decode(chunk)).toMatch(
        `test-script ${outputCount + 1}`,
      );
      outputCount++;
    }
    expect(outputCount).toBe(2);

    const summary = await result.summary;
    expect(summary).toEqual(
      makeExitSummary({
        scriptResults: [
          makeScriptExit({ metadata: { name: "test-script name 1" } }),
        ],
      }),
    );
  });

  test("Run Scripts - stdout and stderr - process output (text)", async () => {
    const result = await runScripts({
      scripts: [
        {
          metadata: { name: "test-script name 1" },
          scriptCommand: {
            command: IS_WINDOWS
              ? `echo test-script 1 && echo test-script 2 1>&2`
              : "echo 'test-script 1' && echo 'test-script 2' >&2",
            workingDirectory: "",
          },
          env: {},
        },
      ],
      parallel: false,
    });

    let outputCount = 0;
    for await (const { metadata, chunk } of result.processOutput.text()) {
      expect(metadata.name).toBe("test-script name 1");
      expect(metadata.streamName).toBe(outputCount === 1 ? "stderr" : "stdout");
      expect(chunk.trim()).toBe(`test-script ${outputCount + 1}`);
      outputCount++;
    }
    expect(outputCount).toBe(2);

    const summary = await result.summary;
    expect(summary).toEqual(
      makeExitSummary({
        scriptResults: [
          makeScriptExit({ metadata: { name: "test-script name 1" } }),
        ],
      }),
    );
  });

  test("Run Scripts - simple series with failure", async () => {
    const result = await runScripts({
      scripts: [
        {
          metadata: {
            name: "test-script name 1",
          },
          scriptCommand: {
            command: IS_WINDOWS
              ? "echo test-script 1 && exit /b 1"
              : "echo 'test-script 1' && exit 1",
            workingDirectory: "",
          },
          env: {},
        },
        {
          metadata: {
            name: "test-script name 2",
          },
          scriptCommand: {
            command: "echo test-script 2",
            workingDirectory: "",
          },
          env: {},
        },
      ],
      parallel: false,
    });

    let i = 0;
    for await (const { metadata, chunk } of result.processOutput.text()) {
      expect(metadata.name).toBe(`test-script name ${i + 1}`);
      expect(metadata.streamName).toBe("stdout");
      expect(chunk.trim()).toMatch(`test-script ${i + 1}`);
      i++;
    }

    const summary = await result.summary;
    expect(summary).toEqual(
      makeExitSummary({
        totalCount: 2,
        successCount: 1,
        failureCount: 1,
        allSuccess: false,
        scriptResults: [
          makeScriptExit({
            exitCode: 1,
            success: false,
            metadata: { name: "test-script name 1" },
          }),
          makeScriptExit({ metadata: { name: "test-script name 2" } }),
        ],
      }),
    );
  });

  test("Run Scripts - simple parallel", async () => {
    const scripts = [
      {
        metadata: {
          name: "test-script name 1",
        },
        scriptCommand: {
          command: IS_WINDOWS
            ? "ping 127.0.0.1 -n 3 >nul && echo test-script 1"
            : "sleep 0.5 && echo test-script 1",
          workingDirectory: "",
        },
        env: {},
      },
      {
        metadata: {
          name: "test-script name 2",
        },
        scriptCommand: {
          command: IS_WINDOWS
            ? "echo test-script 2 && exit /b 2"
            : "echo 'test-script 2' && exit 2",
          workingDirectory: "",
        },
        env: {},
      },
      {
        metadata: {
          name: "test-script name 3",
        },
        scriptCommand: {
          command: IS_WINDOWS
            ? "ping 127.0.0.1 -n 2 >nul && echo test-script 3"
            : "sleep 0.25 && echo test-script 3",
          workingDirectory: "",
        },
        env: {},
      },
    ];

    const result = await runScripts({
      scripts,
      parallel: true,
    });

    let i = 0;
    for await (const { metadata, chunk } of result.processOutput.text()) {
      expect(metadata.streamName).toBe("stdout");
      const scriptNum = i === 0 ? 2 : i === 1 ? 3 : 1;
      expect(metadata.name).toBe(`test-script name ${scriptNum}`);
      expect(chunk.trim()).toMatch(`test-script ${scriptNum}`);
      i++;
    }

    const summary = await result.summary;
    expect(summary).toEqual(
      makeExitSummary({
        totalCount: 3,
        successCount: 2,
        failureCount: 1,
        allSuccess: false,
        scriptResults: [
          makeScriptExit({ metadata: { name: "test-script name 1" } }),
          makeScriptExit({
            exitCode: 2,
            success: false,
            metadata: { name: "test-script name 2" },
          }),
          makeScriptExit({ metadata: { name: "test-script name 3" } }),
        ],
      }),
    );
  });

  test.each([1, 2, 3, 4, 5])(
    `Run Scripts - parallel max count %d`,
    async (max) => {
      const runId = randomUUID();

      const outputDir = path.join(
        __dirname,
        "test-output",
        "run-script-internals-parallel-max",
        runId,
      );
      if (fs.existsSync(outputDir)) {
        fs.rmSync(outputDir, { recursive: true });
      }
      fs.mkdirSync(outputDir, { recursive: true });

      const getRunningFile = (scriptName: string) =>
        path.join(outputDir, `${scriptName}.txt`);

      const getRandomSleepTime = () => Math.max(0.075, Math.random() + 0.025);

      const createScript = (scriptName: string) => ({
        metadata: { name: scriptName },
        scriptCommand: {
          command: IS_WINDOWS
            ? `echo test-script ${scriptName} > ${getRunningFile(scriptName)}  && ` +
              `dir /b ${outputDir} | find /c /v "" && ` +
              `ping 127.0.0.1 -n 2 -w ${Math.floor(getRandomSleepTime() * 1000)} >nul && ` +
              `del ${getRunningFile(scriptName)}`
            : `echo 'test-script ${scriptName}' > ${getRunningFile(
                scriptName,
              )} && ls ${outputDir} | wc -l && sleep ${getRandomSleepTime()} && rm ${getRunningFile(
                scriptName,
              )}`,
          workingDirectory: "",
        },
        env: {},
      });

      const result = await runScripts({
        parallel: {
          max,
        },
        scripts: [
          createScript("test-script-1"),
          createScript("test-script-2"),
          createScript("test-script-3"),
          createScript("test-script-4"),
          createScript("test-script-5"),
        ],
      });

      let didMaxRun = false;
      for await (const { chunk } of result.processOutput.text()) {
        const count = parseInt(chunk.trim());
        if (count === max) {
          didMaxRun = true;
        }
        expect(count).toBeLessThanOrEqual(max);
      }

      expect(didMaxRun).toBe(true);

      const summary = await result.summary;
      expect(summary).toEqual(
        makeExitSummary({
          totalCount: 5,
          successCount: 5,
          scriptResults: [
            makeScriptExit({ metadata: { name: "test-script-1" } }),
            makeScriptExit({ metadata: { name: "test-script-2" } }),
            makeScriptExit({ metadata: { name: "test-script-3" } }),
            makeScriptExit({ metadata: { name: "test-script-4" } }),
            makeScriptExit({ metadata: { name: "test-script-5" } }),
          ],
        }),
      );
    },
  );

  test.each([3, "auto", "default", "unbounded", "100%", "50%"])(
    "Run Scripts - confirm parallel max arg types (%p)",
    async (max) => {
      const result = await runScripts({
        parallel: {
          max,
        },
        scripts: [
          {
            scriptCommand: {
              command: IS_WINDOWS
                ? `echo %_BW_PARALLEL_MAX%`
                : "echo $_BW_PARALLEL_MAX",
              workingDirectory: "",
            },
            metadata: {},
            env: {
              _BW_PARALLEL_MAX: max.toString(),
            },
          },
        ],
      });

      for await (const { chunk } of result.processOutput.text()) {
        const envMax = chunk.trim();
        if (typeof max === "number") {
          expect(envMax).toBe(max.toString());
        } else if (max === "default") {
          expect(envMax).toBe(
            process.env[getUserEnvVarName("parallelMaxDefault")]?.trim() ??
              availableParallelism().toString(),
          );
        } else if (max === "auto") {
          expect(envMax).toBe(availableParallelism().toString());
        } else if (max === "unbounded") {
          expect(envMax).toBe("Infinity");
        } else if (max === "100%") {
          expect(envMax).toBe(availableParallelism().toString());
        } else if (max === "50%") {
          expect(envMax).toBe(
            Math.floor(availableParallelism() * 0.5).toString(),
          );
        }
      }
    },
  );

  test.each([1, 2, 3])(
    "Run Scripts - uses default parallel max (%d)",
    async (max) => {
      process.env[getUserEnvVarName("parallelMaxDefault")] = max.toString();

      const defaultResult = await runScripts({
        parallel: true,
        scripts: [
          {
            scriptCommand: {
              command: IS_WINDOWS
                ? `echo %_BW_PARALLEL_MAX%`
                : "echo $_BW_PARALLEL_MAX",
              workingDirectory: "",
            },
            metadata: {},
            env: {},
          },
        ],
      });

      for await (const { chunk } of defaultResult.processOutput.text()) {
        expect(chunk.trim()).toBe(max.toString());
      }

      const explicitResult = await runScripts({
        parallel: {
          max: "default",
        },
        scripts: [
          {
            scriptCommand: {
              command: IS_WINDOWS
                ? `echo %_BW_PARALLEL_MAX%`
                : "echo $_BW_PARALLEL_MAX",
              workingDirectory: "",
            },
            metadata: {},
            env: {},
          },
        ],
      });

      for await (const { chunk } of explicitResult.processOutput.text()) {
        expect(chunk.trim()).toBe(max.toString());
      }
    },
  );

  test("Run Scripts - cyclical default parallel max as 'default' handled as 'auto'", async () => {
    process.env[getUserEnvVarName("parallelMaxDefault")] = "default";

    const result = await runScripts({
      parallel: true,
      scripts: [
        {
          scriptCommand: {
            command: IS_WINDOWS
              ? `echo %_BW_PARALLEL_MAX%`
              : "echo $_BW_PARALLEL_MAX",
            workingDirectory: "",
          },
          metadata: {},
          env: {},
        },
      ],
    });

    for await (const { chunk } of result.processOutput.text()) {
      expect(chunk.trim()).toBe(availableParallelism().toString());
    }
  });

  test("Env vars are passed", async () => {
    const testValue = `test value ${Math.round(Math.random() * 1000000)}`;
    const scriptCommand = {
      command: IS_WINDOWS
        ? `echo %NODE_ENV% %TEST_ENV_VAR%`
        : "echo $NODE_ENV $TEST_ENV_VAR",
      workingDirectory: ".",
      env: { TEST_ENV_VAR: testValue },
    };

    const options = {
      scriptCommand,
      metadata: {},
      env: { TEST_ENV_VAR: testValue },
    };

    const result = await runScripts({
      scripts: [options, options],
      parallel: false,
    });

    for await (const outputChunk of result.processOutput.text()) {
      expect(outputChunk.metadata.streamName).toBe("stdout");
      expect(outputChunk.chunk.trim()).toBe(`test ${testValue}`);
    }

    await result.summary;
  });
});
