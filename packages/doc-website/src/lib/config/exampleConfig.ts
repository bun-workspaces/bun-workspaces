import {
  type WorkspaceConfig,
  type RootConfig,
  WORKSPACE_CONFIG_PACKAGE_JSON_KEY,
  ROOT_CONFIG_PACKAGE_JSON_KEY,
} from "bun-workspaces/src/config";

export const exampleRootConfigSimple1: RootConfig = {
  defaults: {
    parallelMax: 4,
    shell: "system",
    includeRootWorkspace: false,
  },
};

export const exampleRootConfigSimple2: RootConfig = {
  defaults: {
    parallelMax: "50%",
    shell: "system",
    includeRootWorkspace: true,
  },
};

export const exampleWorkspaceConfigSimple: WorkspaceConfig = {
  alias: "myApp",
  scripts: {
    start: {
      order: 10,
    },
    test: {
      order: 20,
    },
  },
};

export const exampleWorkspaceConfigArray: WorkspaceConfig = {
  alias: ["myApp", "my-app"],
};

export const createPackageJsonExample = (
  config: object,
  target: "workspace" | "root",
) => {
  return {
    name:
      target === "workspace" ? "@my-organization/my-application" : "my-project",
    description: target === "workspace" ? "My app" : "My project root",
    ...(target === "root"
      ? {
          workspaces: ["packages/*"],
        }
      : { version: "1.0.0" }),
    [target === "workspace"
      ? WORKSPACE_CONFIG_PACKAGE_JSON_KEY
      : ROOT_CONFIG_PACKAGE_JSON_KEY]: config,
  };
};

export const createTsFileExample = (
  config: object,
  target: "workspace" | "root",
) => {
  return `
import { ${target === "workspace" ? "defineWorkspaceConfig" : "defineRootConfig"} } from "bun-workspaces/config";

export default ${target === "workspace" ? "defineWorkspaceConfig" : "defineRootConfig"}(${JSON.stringify(config, null, 2)});
`.trim();
};
