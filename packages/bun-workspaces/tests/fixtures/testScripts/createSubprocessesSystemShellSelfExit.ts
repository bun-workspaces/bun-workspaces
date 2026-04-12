/* eslint-disable no-console */

import { IS_WINDOWS } from "../../../src/internal/core";
import { createScriptExecutor } from "../../../src/runScript/scriptExecution";
import { createSubprocess } from "../../../src/runScript/subprocesses";

if (import.meta.main) {
  (async () => {
    // On Windows, cmd /d /s /c call <batchfile> spawns cmd, which then spawns
    // timeout.exe — the grandchild we're testing cleanup for.
    const command = IS_WINDOWS ? "timeout /t 30 /nobreak" : "sleep 30; true";
    for (let i = 0; i < 2; i++) {
      const { argv, cleanup } = createScriptExecutor(command, "system");
      const subprocess = createSubprocess(argv, {
        cwd: process.cwd(),
        env: process.env as Record<string, string>,
        stdout: "ignore",
        stderr: "ignore",
      });
      console.log(subprocess.pid.toString());
      subprocess.exited.finally(cleanup);
    }

    // Allow time for the shell to fork its child processes before exit.
    await Bun.sleep(700);

    // Exit gracefully so process.on("exit") fires, which triggers runOnExit
    // handlers → taskkill /F /T /PID for each subprocess on Windows.
    process.exit(0);
  })();
}
