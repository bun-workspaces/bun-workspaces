import path from "path";
import { describe, test, expect } from "bun:test";
import { IS_LINUX, IS_WINDOWS } from "../../../../src/internal/core";
import { createProcessOutput } from "../../../../src/runScript/output/processOutput";

const FIXTURE_PATH = path.join(
  import.meta.dir,
  "../../../fixtures/testScripts/createSubprocesses.ts",
);

const SYSTEM_SHELL_FIXTURE_PATH = path.join(
  import.meta.dir,
  "../../../fixtures/testScripts/createSubprocessesSystemShell.ts",
);

const SYSTEM_SHELL_SELF_EXIT_FIXTURE_PATH = path.join(
  import.meta.dir,
  "../../../fixtures/testScripts/createSubprocessesSystemShellSelfExit.ts",
);

/** Returns the direct child PIDs of a process using Linux procfs. */
const getChildPids = async (ppid: number): Promise<number[]> => {
  try {
    const content = await Bun.file(
      `/proc/${ppid}/task/${ppid}/children`,
    ).text();
    return content
      .trim()
      .split(/\s+/)
      .map(Number)
      .filter((n) => n > 0);
  } catch {
    return [];
  }
};

/** Returns the direct child PIDs of a process using PowerShell on Windows. */
const getChildPidsWindows = async (ppid: number): Promise<number[]> => {
  try {
    const result = Bun.spawnSync(
      [
        "powershell",
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `$p = (Get-CimInstance Win32_Process -Filter 'ParentProcessId=${ppid}').ProcessId; if ($p) { $p -join "\`n" }`,
      ],
      { stdout: "pipe", stderr: "ignore" },
    );
    return result.stdout
      .toString()
      .trim()
      .split(/\r?\n/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0);
  } catch {
    return [];
  }
};

const pidExists = async (pid: number): Promise<boolean> => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

/** Returns true if ALL given PIDs are alive (single PowerShell invocation). */
const allPidsAliveWindows = (pids: number[]): boolean => {
  try {
    const pidList = pids.join(",");
    const result = Bun.spawnSync(
      [
        "powershell",
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `$alive = @(Get-Process -Id @(${pidList}) -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id); $pids = @(${pidList}); ($pids | Where-Object { $alive -notcontains $_ }).Count -eq 0`,
      ],
      { stdout: "pipe", stderr: "ignore" },
    );
    return result.stdout.toString().trim().toLowerCase() === "true";
  } catch {
    return false;
  }
};

/** Returns true if ANY of the given PIDs are still alive (single PowerShell invocation). */
const anyPidAliveWindows = (pids: number[]): boolean => {
  try {
    const pidList = pids.join(",");
    const result = Bun.spawnSync(
      [
        "powershell",
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `(Get-Process -Id @(${pidList}) -ErrorAction SilentlyContinue).Count -gt 0`,
      ],
      { stdout: "pipe", stderr: "ignore" },
    );
    return result.stdout.toString().trim().toLowerCase() === "true";
  } catch {
    return false;
  }
};

describe("createSubprocess (POSIX)", () => {
  if (IS_WINDOWS) {
    return;
  }

  test(
    "kills registered subprocesses when main process exits via signal",
    async () => {
      // detached: true gives the fixture its own process group so that
      // process.kill(0, signal) inside the fixture does not reach the test runner.
      const fixtureProcess = Bun.spawn(["bun", FIXTURE_PATH], {
        stdout: "pipe",
        stderr: "ignore",
        detached: true,
      });

      const pids: number[] = [];
      for await (const { chunk } of createProcessOutput(
        fixtureProcess.stdout,
        {},
      ).text()) {
        for (const line of Bun.stripANSI(chunk).split("\n")) {
          const pid = parseInt(line.trim(), 10);
          if (Number.isFinite(pid) && pid > 0) pids.push(pid);
        }
        if (pids.length >= 4) break;
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
    },
    { timeout: 10000 },
  );

  test(
    "kills grandchild processes (system shell) when main process exits via SIGTERM",
    async () => {
      if (!IS_LINUX) {
        // getChildPids relies on Linux procfs; skip grandchild assertion elsewhere.
        return;
      }

      const fixtureProcess = Bun.spawn(["bun", SYSTEM_SHELL_FIXTURE_PATH], {
        stdout: "pipe",
        stderr: "ignore",
        detached: true,
      });

      // Collect the sh PIDs printed by the fixture (one per subprocess).
      const shPids: number[] = [];
      for await (const { chunk } of createProcessOutput(
        fixtureProcess.stdout,
        {},
      ).text()) {
        for (const line of Bun.stripANSI(chunk).split("\n")) {
          const pid = parseInt(line.trim(), 10);
          if (Number.isFinite(pid) && pid > 0) shPids.push(pid);
        }
        if (shPids.length >= 2) break;
      }

      expect(shPids).toHaveLength(2);

      // Give sh time to fork its sleep child.
      await Bun.sleep(300);

      // Collect grandchild PIDs (the sleep processes sh forked).
      const grandchildPids: number[] = [];
      for (const shPid of shPids) {
        grandchildPids.push(...(await getChildPids(shPid)));
      }

      expect(grandchildPids.length).toBeGreaterThan(0);

      for (const pid of [...shPids, ...grandchildPids]) {
        expect(await pidExists(pid)).toBe(true);
      }

      fixtureProcess.kill("SIGTERM");
      await fixtureProcess.exited;

      // Allow kill signals sent to the process group to be processed.
      await Bun.sleep(100);

      for (const pid of [...shPids, ...grandchildPids]) {
        expect(await pidExists(pid)).toBe(false);
      }
    },
    { timeout: 10000 },
  );
});

describe("createSubprocess (Windows)", () => {
  if (!IS_WINDOWS) {
    return;
  }

  test(
    "kills grandchild processes (system shell) when main process exits via process.exit",
    async () => {
      const fixtureProcess = Bun.spawn(
        ["bun", SYSTEM_SHELL_SELF_EXIT_FIXTURE_PATH],
        {
          stdout: "pipe",
          stderr: "ignore",
        },
      );

      // Collect the cmd PIDs printed by the fixture (one per subprocess).
      const cmdPids: number[] = [];
      for await (const { chunk } of createProcessOutput(
        fixtureProcess.stdout,
        {},
      ).text()) {
        for (const line of Bun.stripANSI(chunk).split("\n")) {
          const pid = parseInt(line.trim(), 10);
          if (Number.isFinite(pid) && pid > 0) cmdPids.push(pid);
        }
        if (cmdPids.length >= 2) break;
      }

      expect(cmdPids).toHaveLength(2);

      // Give cmd time to fork timeout.exe.
      await Bun.sleep(500);

      // Collect grandchild PIDs (timeout.exe spawned by cmd).
      const grandchildPids: number[] = [];
      for (const cmdPid of cmdPids) {
        grandchildPids.push(...(await getChildPidsWindows(cmdPid)));
      }

      expect(grandchildPids.length).toBeGreaterThan(0);

      // Single PowerShell call to verify all processes are alive.
      expect(allPidsAliveWindows([...cmdPids, ...grandchildPids])).toBe(true);

      // Wait for the fixture to exit naturally. It calls process.exit() which
      // fires process.on("exit") → runOnExit handlers → taskkill /F /T /PID.
      await fixtureProcess.exited;

      // Allow taskkill to finish terminating the process trees.
      await Bun.sleep(500);

      // Single PowerShell call to verify all processes are dead.
      expect(anyPidAliveWindows([...cmdPids, ...grandchildPids])).toBe(false);
    },
    { timeout: 25000 },
  );
});
