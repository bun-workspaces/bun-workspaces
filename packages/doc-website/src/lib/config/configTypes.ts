import type { RootConfig, WorkspaceConfig } from "bun-workspaces/src/config";
import type { RequiredDeep } from "bun-workspaces/src/internal/core";
import {
  PARALLEL_MAX_VALUES,
  SCRIPT_SHELL_OPTIONS,
} from "bun-workspaces/src/runScript";
import { formatSimpleTypeToDisplay, type ValueToDisplay } from "./displayType";

const rootDisplay: ValueToDisplay<RequiredDeep<RootConfig>> = {
  defaults: {
    parallelMax: {
      primitive: true,
      types: ["number", "string"],
    },
    shell: {
      primitive: true,
      types: ["string"],
    },
    includeRootWorkspace: {
      primitive: true,
      types: ["boolean"],
    },
  },
};

export const ROOT_CONFIG_TYPE =
  "type RootConfig = " +
  formatSimpleTypeToDisplay(rootDisplay)
    .replace(
      "parallelMax?: number | string",
      "parallelMax?: number | `${number}%` | " +
        PARALLEL_MAX_VALUES.map((value) => `"${value}"`).join(" | "),
    )
    .replace(
      "shell?: string",
      "shell?: " +
        SCRIPT_SHELL_OPTIONS.map((value) => `"${value}"`).join(" | ") +
        ' | "default"',
    );

const workspaceDisplay: ValueToDisplay<RequiredDeep<WorkspaceConfig>> = {
  alias: "string | string[]",
  tags: {
    array: true,
    item: {
      primitive: true,
      types: ["string"],
    },
  },
  scripts: {
    "[script: string]": {
      order: {
        primitive: true,
        types: ["number"],
      },
    },
  },
  rules: {
    workspaceDependencies: {
      allowPatterns: {
        comment: "Cannot use both allowPatterns and denyPatterns",
        array: true,
        item: { primitive: true, types: ["string"] },
      },
      denyPatterns: {
        array: true,
        item: { primitive: true, types: ["string"] },
      },
    },
  },
};

export const WORKSPACE_CONFIG_TYPE =
  formatSimpleTypeToDisplay(workspaceDisplay);
