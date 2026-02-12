import path from "path";
import { expect, test, describe } from "bun:test";
import { loadConfigFile, validateBunWorkspacesConfig } from "../src/config";

describe("Test bun-workspaces config", () => {
  test("Validate config", () => {
    // @ts-expect-error - Invalid config
    expect(() => validateBunWorkspacesConfig(123)).toThrow();

    // @ts-expect-error - Invalid config
    expect(() => validateBunWorkspacesConfig("")).toThrow();

    // @ts-expect-error - Invalid config
    expect(() => validateBunWorkspacesConfig([])).toThrow();

    // @ts-expect-error - Invalid config
    expect(() => validateBunWorkspacesConfig({ cli: [] })).toThrow();

    // @ts-expect-error - Invalid config
    expect(() => validateBunWorkspacesConfig({ cli: 123 })).toThrow();

    // @ts-expect-error - Invalid config
    expect(() => validateBunWorkspacesConfig({ cli: "" })).toThrow();

    // @ts-expect-error - Invalid config
    expect(() => validateBunWorkspacesConfig({ project: [] })).toThrow();

    // @ts-expect-error - Invalid config
    expect(() => validateBunWorkspacesConfig({ project: 123 })).toThrow();

    // @ts-expect-error - Invalid config
    expect(() => validateBunWorkspacesConfig({ project: "" })).toThrow();

    expect(() =>
      // @ts-expect-error - Invalid log level
      validateBunWorkspacesConfig({ cli: { logLevel: "invalid" } }),
    ).toThrow();

    expect(() =>
      // @ts-expect-error - Invalid workspaceAliases
      validateBunWorkspacesConfig({ project: { workspaceAliases: 123 } }),
    ).toThrow();

    expect(() => validateBunWorkspacesConfig({})).not.toThrow();

    expect(() =>
      validateBunWorkspacesConfig({ cli: { logLevel: "info" } }),
    ).not.toThrow();

    expect(() =>
      validateBunWorkspacesConfig({
        cli: { logLevel: "silent" },
        project: {
          workspaceAliases: { app: "@test/a", lib: "@test/b" },
        },
      }),
    ).not.toThrow();
  });

  test("Load config file", () => {
    const getPath = (filePath: string) =>
      path.resolve(__dirname, "fixtures", "testConfigs", filePath);
    expect(() => loadConfigFile(getPath("invalid1.json"))).toThrow();
    expect(() => loadConfigFile(getPath("does-not-exist.json"))).toThrow();
    expect(() => loadConfigFile(getPath("valid.json"))).not.toThrow();
    expect(loadConfigFile(getPath("valid.json"))).toEqual({
      cli: { logLevel: "info" },
      project: {
        workspaceAliases: { app: "@test/a", lib: "@test/b" },
      },
    });
  });
});
