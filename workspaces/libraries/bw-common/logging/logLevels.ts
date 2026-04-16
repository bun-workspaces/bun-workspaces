export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;

export const getLogLevelNumber = (level: LogLevel) => LOG_LEVELS.indexOf(level);

export type LogLevel = (typeof LOG_LEVELS)[number];

export type LogLevelSetting = LogLevel | "silent";
