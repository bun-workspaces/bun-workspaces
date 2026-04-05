import { defineRootConfig } from "bun-workspaces/config";

export default defineRootConfig({
  defaults: {
    parallelMax: 3,
  },
});
