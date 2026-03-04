/* eslint-disable no-console */

import { createSubprocess } from "../../../src/runScript/subprocesses";

if (import.meta.main) {
  for (let i = 0; i < 4; i++) {
    // Use native sleep directly — shell wrappers (bun/sh) ignore SIGINT while
    // waiting for a foreground child, so the kill forwarded by createSubprocess
    // would never reach the actual sleeping process.
    const subprocess = createSubprocess(["sleep", "10"], {
      cwd: process.cwd(),
      stdout: "ignore",
      stderr: "ignore",
    });

    console.log(subprocess.pid.toString());
  }
}
