import { defineRootConfig } from "bun-workspaces/config";

export default defineRootConfig({
  defaults: {},
  workspacePatternConfigs: [
    {
      patterns: ["path:workspaces/libraries/**/*"],
      config: {
        tags: ["library"],
      },
    },
    {
      patterns: ["path:workspaces/meta", "path:workspaces/meta/**/*"],
      config: {
        tags: ["meta", "internal"],
      },
    },
    {
      patterns: ["path:workspaces/packages/**/*"],
      config: {
        tags: ["package", "deployable"],
      },
    },
    {
      patterns: ["path:workspaces/sandboxes/**/*"],
      config: {
        tags: ["sandbox", "internal"],
      },
    },
    {
      patterns: ["path:workspaces/web/**/*"],
      config: {
        tags: ["web", "deployable"],
      },
    },
    {
      patterns: ["tag:deployable"],
      config: {
        rules: {
          workspaceDependencies: {
            allowPatterns: ["bw-common"],
            denyPatterns: ["tag:internal"],
          },
        },
      },
    },
  ],
});
