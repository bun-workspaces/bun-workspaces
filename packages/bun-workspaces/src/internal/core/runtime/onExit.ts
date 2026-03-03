import type { ProcessEventMap } from "process";

type ExitReason = keyof ProcessEventMap | number;
type ExitHandler = (exit?: ExitReason) => unknown;

let handlers: ExitHandler[] = [];
let listenersRegistered = false;

const runAllHandlers = (exit?: ExitReason) => {
  for (const handler of handlers) {
    handler(exit);
  }
  handlers = [];
};

const registerListeners = () => {
  if (listenersRegistered) return;
  listenersRegistered = true;

  process.on("exit", (code) => {
    runAllHandlers(code);
  });

  for (const signal of [
    "SIGINT",
    "SIGTERM",
    "SIGUSR1",
    "SIGUSR2",
    "SIGHUP",
    "SIGQUIT",
  ] satisfies (keyof ProcessEventMap)[]) {
    const handleSignal = () => {
      runAllHandlers(signal);
      process.off(signal, handleSignal);
      process.kill(process.pid, signal);
    };
    process.on(signal, handleSignal);
  }
};

export const runOnExit = <F extends ExitHandler>(fn: F) => {
  registerListeners();
  let ran = false;

  const wrapped = (exit?: ExitReason) => {
    if (ran) return;
    ran = true;
    fn(exit);
    handlers = handlers.filter((handler) => handler !== wrapped);
  };

  handlers.push(wrapped);
};
