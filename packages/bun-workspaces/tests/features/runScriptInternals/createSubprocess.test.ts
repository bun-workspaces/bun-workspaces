import path from "path";
import { $ } from "bun";
import { describe, test, expect } from "bun:test";
import { createProcessOutput } from "../../../src/runScript/output/processOutput";

const FIXTURE_PATH = path.join(
  import.meta.dir,
  "../../fixtures/testScripts/createSubprocesses.ts",
);

const pidExists = async (pid: number): Promise<boolean> =>
  (await $`kill -0 ${pid}`.nothrow().quiet()).exitCode === 0;

describe("createSubprocess", () => {
  test(
    "kills registered subprocesses when main process exits via signal",
    async () => {
      // Spawn bun directly (no shell wrapper) so SIGINT reaches the process
      // that has the onExit handlers registered
      const fixtureProcess = Bun.spawn(["bun", FIXTURE_PATH], {
        stdout: "pipe",
        stderr: "ignore",
      });

      const pids: number[] = [];
      for await (const { chunk } of createProcessOutput(
        fixtureProcess.stdout,
        {},
      ).text()) {
        pids.push(parseInt(Bun.stripANSI(chunk).trim(), 10));
        if (pids.length === 4) break;
      }

      expect(pids).toHaveLength(4);
      expect(pids.every((pid) => Number.isFinite(pid) && pid > 0)).toBe(true);

      for (const pid of pids) {
        expect(await pidExists(pid)).toBe(true);
      }

      fixtureProcess.kill("SIGINT");
      await fixtureProcess.exited;

      // Allow kill signals sent to subprocesses to be processed
      await Bun.sleep(100);

      for (const pid of pids) {
        expect(await pidExists(pid)).toBe(false);
      }

      expect(fixtureProcess.signalCode).toBe("SIGINT");
    },
    { timeout: 10000 },
  );
});
