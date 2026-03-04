import { runOnExit } from "../internal/core";
import { logger } from "../internal/logger";

const SUBPROCESS_REGISTRY: Record<number, Bun.Subprocess> = {};

runOnExit((codeOrSignal) => {
  Object.values(SUBPROCESS_REGISTRY).forEach((subprocess) => {
    if (!subprocess.killed && subprocess.exitCode === null) {
      logger.debug(
        `Killing subprocess ${subprocess.pid} with signal ${codeOrSignal}`,
      );
      subprocess.kill(codeOrSignal);
    }
  });
});

/**Essentially a wrapper around `Bun.spawn` that ensures all
 * the subprocess is killed when the main process exits for any
 * handle-able exit code or signal. */
export const createSubprocess = <
  In extends Bun.SpawnOptions.Writable,
  Out extends Bun.SpawnOptions.Readable,
  Err extends Bun.SpawnOptions.Readable,
>(
  argv: string[],
  options: Bun.Spawn.SpawnOptions<In, Out, Err>,
): Bun.Subprocess<In, Out, Err> => {
  const subprocess = Bun.spawn(argv, options);

  SUBPROCESS_REGISTRY[subprocess.pid] = subprocess;

  subprocess.exited.finally(() => {
    delete SUBPROCESS_REGISTRY[subprocess.pid];
  });

  return subprocess;
};
