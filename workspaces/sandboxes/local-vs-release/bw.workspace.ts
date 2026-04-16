import { defineWorkspaceConfig } from "bun-workspaces/config";

export default defineWorkspaceConfig({
  alias: ["sandbox", "sbx", "local-vs-release"],
  tags: ["dev-only", "sandbox"],
});
