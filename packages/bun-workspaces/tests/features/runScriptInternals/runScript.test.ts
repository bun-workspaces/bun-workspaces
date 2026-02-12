import { test, expect, describe } from "bun:test";
import { IS_WINDOWS } from "../../../src/internal/core";
import {
  runScript,
  runScripts,
  type RunScriptExit,
} from "../../../src/runScript";

const makeExitResult = (
  overrides: Partial<RunScriptExit> = {},
): RunScriptExit => ({
  exitCode: 0,
  success: true,
  startTimeISO: expect.any(String),
  endTimeISO: expect.any(String),
  durationMs: expect.any(Number),
  signal: null,
  metadata: {},
  ...overrides,
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
    expect(exit).toEqual(makeExitResult({}));
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
    expect(exit).toEqual(makeExitResult({ exitCode: 2, success: false }));
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
      expect(exit).toEqual(
        makeExitResult({
          exitCode: 134,
          success: false,
          signal: "SIGABRT",
        }),
      );
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
    expect(exit).toEqual(makeExitResult({}));
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
