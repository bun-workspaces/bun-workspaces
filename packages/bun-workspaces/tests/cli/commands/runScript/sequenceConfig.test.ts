import { test, expect, describe } from "bun:test";
import { setupCliTest, assertOutputMatches } from "../../../util/cliTestUtils";

describe("CLI Run Script (sequence config)", () => {
  describe("delay project with sequence config", () => {
    test("series runs in configured order", async () => {
      const { run } = setupCliTest({
        testProject: "runScriptWithDelaysAndSequenceConfig",
      });
      const result = await run("run-script", "test-delay");
      expect(result.exitCode).toBe(0);
      assertOutputMatches(
        result.stdoutAndErr.sanitizedCompactLines,
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
    });

    test("parallel runs in parallel", async () => {
      const { run } = setupCliTest({
        testProject: "runScriptWithDelaysAndSequenceConfig",
      });
      const result = await run("run-script", "test-delay", "--parallel");
      expect(result.exitCode).toBe(0);
      assertOutputMatches(
        result.stdoutAndErr.sanitizedCompactLines,
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
    });
  });

  describe("sequence config (full order)", () => {
    test("series runs in configured order", async () => {
      const { run } = setupCliTest({
        testProject: "runScriptWithSequenceConfig",
      });
      const result = await run("run-script", "test-echo");
      expect(result.exitCode).toBe(0);
      assertOutputMatches(
        result.stdoutAndErr.sanitizedCompactLines,
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
    });

    test("parallel runs (order may vary)", async () => {
      const { run } = setupCliTest({
        testProject: "runScriptWithSequenceConfig",
      });
      const result = await run("run-script", "test-echo", "--parallel");
      expect(result.exitCode).toBe(0);
      assertOutputMatches(
        result.stdoutAndErr.sanitizedCompactLines,
        new RegExp(`
✅ first: test-echo
✅ second: test-echo
✅ third: test-echo
✅ fourth: test-echo
✅ fifth: test-echo
5 scripts ran successfully`),
      );
    });
  });

  describe("sequence config (partial order)", () => {
    test("series runs in configured order", async () => {
      const { run } = setupCliTest({
        testProject: "runScriptWithSequenceConfigPartial",
      });
      const result = await run("run-script", "test-echo");
      expect(result.exitCode).toBe(0);
      assertOutputMatches(
        result.stdoutAndErr.sanitizedCompactLines,
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
    });

    test("parallel runs (order may vary)", async () => {
      const { run } = setupCliTest({
        testProject: "runScriptWithSequenceConfigPartial",
      });
      const result = await run("run-script", "test-echo", "--parallel");
      expect(result.exitCode).toBe(0);
      assertOutputMatches(
        result.stdoutAndErr.sanitizedCompactLines,
        new RegExp(`✅ e: test-echo
✅ d: test-echo
✅ b: test-echo
✅ a: test-echo
✅ c: test-echo
5 scripts ran successfully`),
      );
    });
  });
});
