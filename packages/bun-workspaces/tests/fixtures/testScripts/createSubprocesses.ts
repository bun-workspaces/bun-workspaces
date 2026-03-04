/* eslint-disable no-console */

import { createScriptExecutor } from "../../../src/runScript/scriptExecution";
import { createSubprocess } from "../../../src/runScript/subprocesses";

if (import.meta.main) {
  const cleanups: (() => void)[] = [];
  const subprocesses: Bun.Subprocess[] = [];
  for (let i = 0; i < 4; i++) {
    const { argv, cleanup } = createScriptExecutor("sleep 10", "bun");
    cleanups.push(cleanup);

    const subprocess = createSubprocess(argv, {
      cwd: process.cwd(),
      env: process.env,
      stdout: "pipe",
      stderr: "pipe",
    });

    console.log(subprocess.pid.toString());

    subprocesses.push(subprocess);
  }
}
