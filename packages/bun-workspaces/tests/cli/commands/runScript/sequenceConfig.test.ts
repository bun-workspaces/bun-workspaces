import { test, expect, describe } from "bun:test";
import { setupCliTest, assertOutputMatches } from "../../../util/cliTestUtils";

describe("CLI Run Script (sequence config)", () => {
  test("Run script sequence config", async () => {
    const { run: runDelay } = setupCliTest({
      testProject: "runScriptWithDelaysAndSequenceConfig",
    });
    const seriesDelayResult = await runDelay("run-script", "test-delay");
    expect(seriesDelayResult.exitCode).toBe(0);
    assertOutputMatches(
      seriesDelayResult.stdoutAndErr.sanitizedCompactLines,
      `[first:test-delay] first
[second:test-delay] second
[third:test-delay] third
[fourth:test-delay] fourth
[fifth:test-delay] fifth
✅ first: test-delay
✅ second: test-delay
✅ third: test-delay
✅ fourth: test-delay
✅ fifth: test-delay
5 scripts ran successfully`,
    );

    const parallelDelayResult = await runDelay(
      "run-script",
      "test-delay",
      "--parallel",
    );
    expect(parallelDelayResult.exitCode).toBe(0);
    assertOutputMatches(
      parallelDelayResult.stdoutAndErr.sanitizedCompactLines,
      `[first:test-delay] first
[second:test-delay] second
[third:test-delay] third
[fourth:test-delay] fourth
[fifth:test-delay] fifth
✅ first: test-delay
✅ second: test-delay
✅ third: test-delay
✅ fourth: test-delay
✅ fifth: test-delay
5 scripts ran successfully`,
    );

    const { run: runSequence } = setupCliTest({
      testProject: "runScriptWithSequenceConfig",
    });
    const seriesSequenceResult = await runSequence("run-script", "test-echo");
    expect(seriesSequenceResult.exitCode).toBe(0);
    assertOutputMatches(
      seriesSequenceResult.stdoutAndErr.sanitizedCompactLines,
      `[first:test-echo] first
[second:test-echo] second
[third:test-echo] third
[fourth:test-echo] fourth
[fifth:test-echo] fifth
✅ first: test-echo
✅ second: test-echo
✅ third: test-echo
✅ fourth: test-echo
✅ fifth: test-echo
5 scripts ran successfully`,
    );

    const parallelSequenceResult = await runSequence(
      "run-script",
      "test-echo",
      "--parallel",
    );
    expect(parallelSequenceResult.exitCode).toBe(0);
    assertOutputMatches(
      parallelSequenceResult.stdoutAndErr.sanitizedCompactLines,
      new RegExp(`
✅ first: test-echo
✅ second: test-echo
✅ third: test-echo
✅ fourth: test-echo
✅ fifth: test-echo
5 scripts ran successfully`),
    );

    const { run: runSequencePartial } = setupCliTest({
      testProject: "runScriptWithSequenceConfigPartial",
    });
    const seriesSequencePartialResult = await runSequencePartial(
      "run-script",
      "test-echo",
    );
    expect(seriesSequencePartialResult.exitCode).toBe(0);
    assertOutputMatches(
      seriesSequencePartialResult.stdoutAndErr.sanitizedCompactLines,
      `[e:test-echo] e
[d:test-echo] d
[b:test-echo] b
[a:test-echo] a
[c:test-echo] c
✅ e: test-echo
✅ d: test-echo
✅ b: test-echo
✅ a: test-echo
✅ c: test-echo
5 scripts ran successfully`,
    );

    const parallelSequencePartialResult = await runSequencePartial(
      "run-script",
      "test-echo",
      "--parallel",
    );
    expect(parallelSequencePartialResult.exitCode).toBe(0);
    assertOutputMatches(
      parallelSequencePartialResult.stdoutAndErr.sanitizedCompactLines,
      new RegExp(`✅ e: test-echo
✅ d: test-echo
✅ b: test-echo
✅ a: test-echo
✅ c: test-echo
5 scripts ran successfully`),
    );
  });
});
