import path from "path";
import { describe, test, expect } from "bun:test";
import { IS_WINDOWS } from "../../../src/internal/core";
import { createProcessOutput } from "../../../src/runScript/output/processOutput";

const FIXTURE_PATH = path.join(
  import.meta.dir,
  "../../fixtures/testScripts/createSubprocesses.ts",
);

const pidExists = async (pid: number): Promise<boolean> => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

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

      const killer = IS_WINDOWS ? 1 : "SIGINT";

      fixtureProcess.kill(killer);
      await fixtureProcess.exited;

      // Allow kill signals sent to subprocesses to be processed
      await Bun.sleep(100);

      for (const pid of pids) {
        expect(await pidExists(pid)).toBe(false);
      }
    },
    { timeout: 10000 },
  );
});
