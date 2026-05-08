export type ScriptLogLevel = "debug" | "info" | "warn" | "error";

/** Use env var DEBUG=true to enable debug logs */
export interface ScriptLogger {
  name: string;
  log: (level: ScriptLogLevel, message: string) => void;
  debug: (message: string) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
}

const LEVEL_ANSI_CODES: Record<ScriptLogLevel, string> = {
  debug: "\x1b[90m",
  info: "\x1b[94m",
  warn: "\x1b[93m",
  error: "\x1b[91m",
};

class _ScriptLogger implements ScriptLogger {
  constructor(public name: string) {}

  log(level: ScriptLogLevel, message: string) {
    console[level](
      `${LEVEL_ANSI_CODES[level]}[${this.name}${level === "info" ? "" : `: ${level.toUpperCase()}`}]\x1b[0m ${message}`,
    );
  }

  debug(message: string) {
    if (process.env.DEBUG !== "true") return;
    this.log("debug", message);
  }
  info(message: string) {
    this.log("info", message);
  }
  warn(message: string) {
    this.log("warn", message);
  }
  error(message: string) {
    this.log("error", message);
  }
}

export interface ScriptLoggerOptions {
  name: string;
}

export const createScriptLogger = (
  options: ScriptLoggerOptions,
): ScriptLogger => new _ScriptLogger(options.name);
