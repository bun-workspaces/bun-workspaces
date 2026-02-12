import os from "os";
import { test, expect, describe } from "bun:test";
import { getUserEnvVar } from "../../../../src/config/userEnvVars";
import { setupCliTest, assertOutputMatches } from "../../../util/cliTestUtils";

describe("CLI Run Script (parallel)", () => {
  test("Running in series vs. parallel", async () => {
    const { run } = setupCliTest({
      testProject: "runScriptWithDelays",
    });

    const resultSeries = await run("run-script", "test-delay");
    expect(resultSeries.exitCode).toBe(0);
    assertOutputMatches(
      resultSeries.stdout.sanitizedCompactLines,
      `[fifth:test-delay] fifth
[first:test-delay] first
[fourth:test-delay] fourth
[second:test-delay] second
[third:test-delay] third
✅ fifth: test-delay
✅ first: test-delay
✅ fourth: test-delay
✅ second: test-delay
✅ third: test-delay
5 scripts ran successfully`,
    );

    const resultParallel = await run("run-script", "test-delay", "--parallel");
    expect(resultParallel.exitCode).toBe(0);
    assertOutputMatches(
      resultParallel.stdout.sanitizedCompactLines,
      `[first:test-delay] first
[second:test-delay] second
[third:test-delay] third
[fourth:test-delay] fourth
[fifth:test-delay] fifth
✅ fifth: test-delay
✅ first: test-delay
✅ fourth: test-delay
✅ second: test-delay
✅ third: test-delay
5 scripts ran successfully`,
    );

    const resultParallelShort = await run("run-script", "test-delay", "-P");
    expect(resultParallelShort.exitCode).toBe(0);
    assertOutputMatches(
      resultParallelShort.stdout.sanitizedCompactLines,
      `[first:test-delay] first
[second:test-delay] second
[third:test-delay] third
[fourth:test-delay] fourth
[fifth:test-delay] fifth
✅ fifth: test-delay
✅ first: test-delay
✅ fourth: test-delay
✅ second: test-delay
✅ third: test-delay
5 scripts ran successfully`,
    );
  });

  test.each([1, 2, 3, "default", "auto", "unbounded", "100%", "50%"])(
    "runScriptAcrossWorkspaces: parallel with max (%p)",
    async (max) => {
      const { run } = setupCliTest({
        testProject: "runScriptWithDebugParallelMax",
      });
      const { stdout } = await run(
        "run-script",
        "test-debug",
        "--parallel",
        max.toString(),
      );

      const createOutput = (max: number | string) => `[a:test-debug] ${max}`;

      if (typeof max === "number") {
        expect(stdout.sanitizedCompactLines).toStartWith(createOutput(max));
      } else if (max === "default") {
        expect(stdout.sanitizedCompactLines).toStartWith(
          createOutput(
            getUserEnvVar("parallelMaxDefault")?.trim() ??
              os.availableParallelism().toString(),
          ),
        );
      } else if (max === "auto") {
        expect(stdout.sanitizedCompactLines).toStartWith(
          createOutput(os.availableParallelism().toString()),
        );
      } else if (max === "unbounded") {
        expect(stdout.sanitizedCompactLines).toStartWith(
          createOutput("Infinity"),
        );
      } else if (max.endsWith("%")) {
        expect(stdout.sanitizedCompactLines).toStartWith(
          createOutput(
            Math.max(
              1,
              Math.floor(
                (os.availableParallelism() * parseFloat(max.slice(0, -1))) /
                  100,
              ),
            ).toString(),
          ),
        );
      }
    },
  );
});
