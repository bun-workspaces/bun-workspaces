import { defineWorkspaceConfig } from "bun-workspaces/config";

export default defineWorkspaceConfig({
  alias: "bw",
  tags: ["deployable", "package"],
  rules: {
    workspaceDependencies: {
      allowPatterns: ["bw-common"],
    },
  },
});
