import { defineWorkspaceConfig } from "bun-workspaces/config";

export default defineWorkspaceConfig({
  alias: ["doc-website", "docs", "docs-website", "docs-web", "documentation"],
  tags: ["deployable", "static-website", "web"],
  rules: {
    workspaceDependencies: {
      allowPatterns: ["bw-common"],
    },
  },
});
