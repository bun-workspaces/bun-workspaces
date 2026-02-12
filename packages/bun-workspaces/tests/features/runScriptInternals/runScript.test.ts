import { randomUUID } from "crypto";
import fs from "fs";
import { availableParallelism } from "os";
import path from "path";
import { test, expect, describe, afterAll } from "bun:test";
import { getUserEnvVarName } from "../../../src/config/userEnvVars";
import { IS_WINDOWS } from "../../../src/internal/core";
import { runScript, runScripts } from "../../../src/runScript";

// Sanity tests for lower level runScript and runScripts functions

const originalParallelMaxDefault =
  process.env[getUserEnvVarName("parallelMaxDefault")];

afterAll(() => {
  process.env[getUserEnvVarName("parallelMaxDefault")] =
    originalParallelMaxDefault;
});

describe("Run Single Script", () => {
  test("Simple success", async () => {
    const result = await runScript({
      scriptCommand: {
        command: IS_WINDOWS
          ? `powershell -NoProfile -Command "Write-Output 'test-script 1'"`
          : "echo 'test-script 1'",
        workingDirectory: ".",
      },
      metadata: {},
      env: {},
    });

    let outputCount = 0;
    for await (const outputChunk of result.output) {
      expect(outputChunk.raw).toBeInstanceOf(Uint8Array);
      expect(outputChunk.streamName).toBe("stdout");
      expect(outputChunk.decode()).toMatch(`test-script ${outputCount + 1}`);
      expect(outputChunk.decode({ stripAnsi: true })).toMatch(
        `test-script ${outputCount + 1}`,
      );
      outputCount++;
    }
    const exit = await result.exit;
    expect(exit).toEqual({
      exitCode: 0,
      success: true,
      startTimeISO: expect.any(String),
      endTimeISO: expect.any(String),
      durationMs: expect.any(Number),
      signal: null,
      metadata: {},
    });
    expect(new Date(exit.startTimeISO).getTime()).toBeLessThanOrEqual(
      new Date(exit.endTimeISO).getTime(),
    );
    expect(exit.durationMs).toBe(
      new Date(exit.endTimeISO).getTime() -
        new Date(exit.startTimeISO).getTime(),
    );
    expect(outputCount).toBe(1);
  });

  test("Simple failure", async () => {
    const result = await runScript({
      scriptCommand: {
        command: IS_WINDOWS
          ? "echo test-script 1 && exit /b 2"
          : "echo 'test-script 1' && sleep 0.1 && exit 2",
        workingDirectory: ".",
      },
      metadata: {},
      env: {},
    });

    let outputCount = 0;
    for await (const outputChunk of result.output) {
      expect(outputChunk.raw).toBeInstanceOf(Uint8Array);
      expect(outputChunk.streamName).toBe("stdout");
      expect(outputChunk.decode()).toMatch(`test-script ${outputCount + 1}`);
      expect(outputChunk.decode({ stripAnsi: true })).toMatch(
        `test-script ${outputCount + 1}`,
      );
      outputCount++;
    }
    const exit = await result.exit;
    expect(exit).toEqual({
      exitCode: 2,
      success: false,
      startTimeISO: expect.any(String),
      endTimeISO: expect.any(String),
      durationMs: expect.any(Number),
      signal: null,
      metadata: {},
    });
    expect(new Date(exit.startTimeISO).getTime()).toBeLessThanOrEqual(
      new Date(exit.endTimeISO).getTime(),
    );
    expect(exit.durationMs).toBe(
      new Date(exit.endTimeISO).getTime() -
        new Date(exit.startTimeISO).getTime(),
    );
    expect(outputCount).toBe(1);
  });

  if (!IS_WINDOWS) {
    test("Simple failure with signal", async () => {
      const result = await runScript({
        scriptCommand: {
          command: "sleep 1",
          workingDirectory: ".",
        },
        metadata: {},
        env: {},
      });

      result.kill("SIGABRT");

      const exit = await result.exit;
      expect(exit).toEqual({
        exitCode: 134,
        success: false,
        startTimeISO: expect.any(String),
        endTimeISO: expect.any(String),
        durationMs: expect.any(Number),
        signal: "SIGABRT",
        metadata: {},
      });
    });
  }

  test("With stdout and stderr", async () => {
    const result = await runScript({
      scriptCommand: {
        command: IS_WINDOWS
          ? `echo test-script 1 ^
&& ping 127.0.0.1 -n 2 -w 100 >nul ^
&& echo test-script 2 1>&2 ^
&& ping 127.0.0.1 -n 2 -w 100 >nul ^
&& echo test-script 3`
          : "echo 'test-script 1' && sleep 0.1 && echo 'test-script 2' >&2 && sleep 0.1 && echo 'test-script 3'",
        workingDirectory: ".",
      },
      metadata: {},
      env: {},
    });

    let outputCount = 0;
    for await (const outputChunk of result.output) {
      expect(outputChunk.raw).toBeInstanceOf(Uint8Array);
      expect(outputChunk.streamName).toBe(
        outputCount === 1 ? "stderr" : "stdout",
      );
      expect(outputChunk.decode()).toMatch(`test-script ${outputCount + 1}`);
      expect(outputChunk.decode({ stripAnsi: true })).toMatch(
        `test-script ${outputCount + 1}`,
      );
      outputCount++;
    }

    const exit = await result.exit;
    expect(exit).toEqual({
      exitCode: 0,
      success: true,
      startTimeISO: expect.any(String),
      endTimeISO: expect.any(String),
      durationMs: expect.any(Number),
      signal: null,
      metadata: {},
    });
  });

  test("Env vars are passed", async () => {
    const testValue = `test value ${Math.round(Math.random() * 1000000)}`;
    const scriptCommand = {
      command: IS_WINDOWS
        ? `echo(%NODE_ENV% %TEST_ENV_VAR%`
        : "echo $NODE_ENV $TEST_ENV_VAR",
      workingDirectory: ".",
      env: { TEST_ENV_VAR: testValue },
    };

    const options = {
      scriptCommand,
      metadata: {},
      env: { TEST_ENV_VAR: testValue },
    };

    const singleResult = await runScript(options);

    for await (const outputChunk of singleResult.output) {
      expect(outputChunk.streamName).toBe("stdout");
      expect(outputChunk.decode().trim()).toBe(`test ${testValue}`);
      expect(outputChunk.decode({ stripAnsi: true }).trim()).toBe(
        `test ${testValue}`,
      );
    }

    const multiResult = await runScripts({
      scripts: [options, options],
      parallel: false,
    });

    for await (const { outputChunk } of multiResult.output) {
      expect(outputChunk.raw).toBeInstanceOf(Uint8Array);
      expect(outputChunk.streamName).toBe("stdout");
      expect(outputChunk.decode().trim()).toBe(`test ${testValue}`);
      expect(outputChunk.decode({ stripAnsi: true }).trim()).toBe(
        `test ${testValue}`,
      );
    }
  });

  test("With ANSI escape codes", async () => {
    const result = await runScript({
      scriptCommand: {
        command: "echo \x1b[31mtest-script 1\x1b[0m",
        workingDirectory: ".",
      },
      metadata: {},
      env: {},
    });

    for await (const outputChunk of result.output) {
      expect(outputChunk.streamName).toBe("stdout");
      expect(outputChunk.decode().trim()).toBe(`\x1b[31mtest-script 1\x1b[0m`);
      expect(outputChunk.decode({ stripAnsi: true }).trim()).toBe(
        `test-script 1`,
      );
    }
  });

  test("Confirm scripts have node_modules/.bin in PATH", async () => {
    // This is something due to Bun's process.env.PATH including node_modules/.bin
    // This test helps confirm this is consistent across Bun versions and platforms

    const result = await runScript({
      scriptCommand: {
        command: "which eslint",
        workingDirectory: ".",
      },
      metadata: {},
      env: {},
    });

    for await (const outputChunk of result.output) {
      expect(outputChunk.streamName).toBe("stdout");
      expect(outputChunk.decode().trim()).toMatch(
        /node_modules\/.bin\/eslint$/,
      );
      expect(outputChunk.decode({ stripAnsi: true }).trim()).toMatch(/eslint$/);
    }
  });
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
    for await (const {
      outputChunk: output,
      scriptMetadata: metadata,
    } of result.output) {
      expect(metadata.name).toBe(`test-script name ${i + 1}`);
      expect(output.decode()).toMatch(`test-script ${i + 1}`);
      expect(output.decode({ stripAnsi: true })).toMatch(
        `test-script ${i + 1}`,
      );
      i++;
    }

    const summary = await result.summary;
    expect(summary).toEqual({
      totalCount: 2,
      allSuccess: true,
      failureCount: 0,
      successCount: 2,
      startTimeISO: expect.any(String),
      endTimeISO: expect.any(String),
      durationMs: expect.any(Number),
      scriptResults: [
        {
          exitCode: 0,
          success: true,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
          signal: null,
          metadata: {
            name: "test-script name 1",
          },
        },
        {
          exitCode: 0,
          success: true,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
          signal: null,
          metadata: {
            name: "test-script name 2",
          },
        },
      ],
    });
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
    for await (const {
      outputChunk: output,
      scriptMetadata: metadata,
    } of result.output) {
      expect(metadata.name).toBe(`test-script name ${i + 1}`);
      expect(output.decode()).toMatch(`test-script ${i + 1}`);
      expect(output.decode({ stripAnsi: true })).toMatch(
        `test-script ${i + 1}`,
      );
      i++;
    }

    const summary = await result.summary;
    expect(summary).toEqual({
      totalCount: 2,
      allSuccess: false,
      failureCount: 1,
      successCount: 1,
      startTimeISO: expect.any(String),
      endTimeISO: expect.any(String),
      durationMs: expect.any(Number),
      scriptResults: [
        {
          exitCode: 1,
          success: false,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
          signal: null,
          metadata: {
            name: "test-script name 1",
          },
        },
        {
          exitCode: 0,
          success: true,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
          signal: null,
          metadata: {
            name: "test-script name 2",
          },
        },
      ],
    });
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
    for await (const { outputChunk, scriptMetadata } of result.output) {
      expect(outputChunk.streamName).toBe("stdout");
      const scriptNum = i === 0 ? 2 : i === 1 ? 3 : 1;
      expect(scriptMetadata.name).toBe(`test-script name ${scriptNum}`);
      expect(outputChunk.decode()).toMatch(`test-script ${scriptNum}`);
      expect(outputChunk.decode({ stripAnsi: true })).toMatch(
        `test-script ${scriptNum}`,
      );
      i++;
    }

    const summary = await result.summary;
    expect(summary).toEqual({
      totalCount: 3,
      allSuccess: false,
      failureCount: 1,
      successCount: 2,
      startTimeISO: expect.any(String),
      endTimeISO: expect.any(String),
      durationMs: expect.any(Number),
      scriptResults: [
        {
          exitCode: 0,
          success: true,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
          signal: null,
          metadata: {
            name: "test-script name 1",
          },
        },
        {
          exitCode: 2,
          success: false,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
          signal: null,
          metadata: {
            name: "test-script name 2",
          },
        },
        {
          exitCode: 0,
          success: true,
          startTimeISO: expect.any(String),
          endTimeISO: expect.any(String),
          durationMs: expect.any(Number),
          signal: null,
          metadata: {
            name: "test-script name 3",
          },
        },
      ],
    });
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
      for await (const { outputChunk } of result.output) {
        const count = parseInt(outputChunk.decode().trim());
        if (count === max) {
          didMaxRun = true;
        }
        expect(count).toBeLessThanOrEqual(max);
      }

      expect(didMaxRun).toBe(true);

      const summary = await result.summary;
      expect(summary).toEqual({
        totalCount: 5,
        allSuccess: true,
        failureCount: 0,
        successCount: 5,
        startTimeISO: expect.any(String),
        endTimeISO: expect.any(String),
        durationMs: expect.any(Number),
        scriptResults: [
          {
            exitCode: 0,
            success: true,
            startTimeISO: expect.any(String),
            endTimeISO: expect.any(String),
            durationMs: expect.any(Number),
            signal: null,
            metadata: { name: "test-script-1" },
          },
          {
            exitCode: 0,
            success: true,
            startTimeISO: expect.any(String),
            endTimeISO: expect.any(String),
            durationMs: expect.any(Number),
            signal: null,
            metadata: { name: "test-script-2" },
          },
          {
            exitCode: 0,
            success: true,
            startTimeISO: expect.any(String),
            endTimeISO: expect.any(String),
            durationMs: expect.any(Number),
            signal: null,
            metadata: { name: "test-script-3" },
          },
          {
            exitCode: 0,
            success: true,
            startTimeISO: expect.any(String),
            endTimeISO: expect.any(String),
            durationMs: expect.any(Number),
            signal: null,
            metadata: { name: "test-script-4" },
          },
          {
            exitCode: 0,
            success: true,
            startTimeISO: expect.any(String),
            endTimeISO: expect.any(String),
            durationMs: expect.any(Number),
            signal: null,
            metadata: { name: "test-script-5" },
          },
        ],
      });
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

      for await (const { outputChunk } of result.output) {
        const envMax = outputChunk.decode().trim();
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

      for await (const { outputChunk } of defaultResult.output) {
        expect(outputChunk.decode().trim()).toBe(max.toString());
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

      for await (const { outputChunk } of explicitResult.output) {
        expect(outputChunk.decode().trim()).toBe(max.toString());
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

    for await (const { outputChunk } of result.output) {
      expect(outputChunk.decode().trim()).toBe(
        availableParallelism().toString(),
      );
    }
  });
});
