import { test, expect, describe } from "bun:test";
import { setupCliTest, assertOutputMatches } from "../../../util/cliTestUtils";

describe("CLI Run Script (dependency order)", () => {
  test("withDependenciesSimple - runs in alphabetical order without --dep-order", async () => {
    const { run } = setupCliTest({ testProject: "withDependenciesSimple" });
    const result = await run("run", "test-script");
    expect(result.exitCode).toBe(0);
    assertOutputMatches(
      result.stdout.sanitizedCompactLines,
      `[a-depends-e:test-script] A
[b-depends-cd:test-script] B
[c-depends-e:test-script] C
[d-depends-e:test-script] D
[e:test-script] E
✅ a-depends-e: test-script
✅ b-depends-cd: test-script
✅ c-depends-e: test-script
✅ d-depends-e: test-script
✅ e: test-script
5 scripts ran successfully`,
    );
  });

  test("withDependenciesSimple - runs in dependency graph order with --dep-order", async () => {
    const { run } = setupCliTest({ testProject: "withDependenciesSimple" });
    const result = await run("run", "test-script", "--dep-order");
    expect(result.exitCode).toBe(0);
    assertOutputMatches(
      result.stdout.sanitizedCompactLines,
      `[e:test-script] E
[a-depends-e:test-script] A
[c-depends-e:test-script] C
[d-depends-e:test-script] D
[b-depends-cd:test-script] B
✅ a-depends-e: test-script
✅ b-depends-cd: test-script
✅ c-depends-e: test-script
✅ d-depends-e: test-script
✅ e: test-script
5 scripts ran successfully`,
    );
  });

  test("withDependenciesDirectCycle - logs cycle warning and runs remaining graph in order with --dep-order", async () => {
    const { run } = setupCliTest({ testProject: "withDependenciesDirectCycle" });
    const result = await run("run", "test-script", "--dep-order");
    expect(result.exitCode).toBe(0);
    assertOutputMatches(
      result.stderr.sanitizedCompactLines,
      /Dependency cycle detected: a-depends-c -> c-depends-a/,
    );
    assertOutputMatches(
      result.stdout.sanitizedCompactLines,
      `[a-depends-c:test-script] A
[c-depends-a:test-script] C
[b-depends-c:test-script] B
✅ a-depends-c: test-script
✅ b-depends-c: test-script
✅ c-depends-a: test-script
3 scripts ran successfully`,
    );
  });

  test("withDependenciesWithFailures - skips dependents of failed workspaces with --dep-order", async () => {
    const { run } = setupCliTest({
      testProject: "withDependenciesWithFailures",
    });
    const result = await run("run", "test-script", "--dep-order");
    expect(result.exitCode).toBe(1);
    assertOutputMatches(
      result.stdout.sanitizedCompactLines,
      `[e:test-script] E
[c-depends-e-fails:test-script] C
[d-depends-e:test-script] D
[f-fails:test-script] F
❌ a-depends-f: test-script (exited with code -1)
❌ b-depends-cd: test-script (exited with code -1)
❌ c-depends-e-fails: test-script (exited with code 1)
✅ d-depends-e: test-script
✅ e: test-script
❌ f-fails: test-script (exited with code 1)
4 of 6 scripts failed`,
    );
  });

  test("withDependenciesWithFailures - runs all workspaces with --dep-order --ignore-dep-failure", async () => {
    const { run } = setupCliTest({
      testProject: "withDependenciesWithFailures",
    });
    const result = await run(
      "run",
      "test-script",
      "--dep-order",
      "--ignore-dep-failure",
    );
    expect(result.exitCode).toBe(1);
    assertOutputMatches(
      result.stdout.sanitizedCompactLines,
      `[e:test-script] E
[c-depends-e-fails:test-script] C
[d-depends-e:test-script] D
[b-depends-cd:test-script] B
[f-fails:test-script] F
[a-depends-f:test-script] A
✅ a-depends-f: test-script
✅ b-depends-cd: test-script
❌ c-depends-e-fails: test-script (exited with code 1)
✅ d-depends-e: test-script
✅ e: test-script
❌ f-fails: test-script (exited with code 1)
2 of 6 scripts failed`,
    );
  });
});
