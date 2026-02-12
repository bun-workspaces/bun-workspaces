import { stripANSI } from "bun";
import { test, describe, expect, spyOn, beforeAll, afterAll } from "bun:test";
import { logger, setLogLevel } from "../../src/internal/logger";

describe("setLogLevel", () => {
  /* eslint-disable */
  const debug = console.debug;
  const info = console.info;
  const warn = console.warn;
  const error = console.error;

  beforeAll(() => {
    console.debug = () => {};
    console.info = () => {};
    console.warn = () => {};
    console.error = () => {};
  });

  afterAll(() => {
    console.debug = debug;
    console.info = info;
    console.warn = warn;
    console.error = error;

    setLogLevel("silent");
  });
  /* eslint-enable */

  test("should set the log level", () => {
    const debugSpy = spyOn(console, "debug");
    const infoSpy = spyOn(console, "info");
    const warnSpy = spyOn(console, "warn");
    const errorSpy = spyOn(console, "error");

    setLogLevel("debug");
    expect(logger.printLevel).toBe("debug");

    logger.debug("test debug 1");
    logger.info("test info 1");
    logger.warn("test warn 1");
    logger.error("test error 1");
    expect(debugSpy).toHaveBeenCalledWith(
      "[bun-workspaces DEBUG]: test debug 1",
    );
    expect(infoSpy).toHaveBeenCalledWith("test info 1");
    expect(stripANSI(warnSpy.mock.calls[0][0])).toMatch(
      /^\[bun-workspaces WARN\]: test warn 1$/,
    );
    expect(errorSpy).toHaveBeenCalledWith("test error 1");

    setLogLevel("info");
    expect(logger.printLevel).toBe("info");

    logger.debug("test debug 2");
    logger.info("test info 2");
    logger.warn("test warn 2");
    logger.error("test error 2");
    expect(debugSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledWith("test info 2");
    expect(stripANSI(warnSpy.mock.calls[1][0])).toMatch(
      /^\[bun-workspaces WARN\]: test warn 2$/,
    );
    expect(errorSpy).toHaveBeenCalledWith("test error 2");

    setLogLevel("warn");
    expect(logger.printLevel).toBe("warn");

    logger.debug("test debug 3");
    logger.info("test info 3");
    logger.warn("test warn 3");
    logger.error("test error 3");
    expect(debugSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledTimes(2);
    expect(stripANSI(warnSpy.mock.calls[2][0])).toMatch(
      /^\[bun-workspaces WARN\]: test warn 3$/,
    );
    expect(errorSpy).toHaveBeenCalledWith("test error 3");

    setLogLevel("error");
    expect(logger.printLevel).toBe("error");

    logger.debug("test debug 4");
    logger.info("test info 4");
    logger.warn("test warn 4");
    logger.error("test error 4");
    expect(debugSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenCalledTimes(3);
    expect(errorSpy).toHaveBeenCalledWith("test error 4");
  });
});
