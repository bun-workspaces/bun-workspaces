import packageJson from "../../../package.json";
import { createMcpServer } from "./core";
import { registerBwResources } from "./resources";
import { setServerWorkingDirectory } from "./serverState";
import { registerBwTools } from "./tools";

export const SERVER_INSTRUCTIONS = `
bun-workspaces ${packageJson.version} MCP server: tools to query Bun monorepo workspace metadata and documentation resources for the bun-workspaces CLI and TypeScript API.

bun-workspaces is an npm package that works on top of Bun's native workspaces. It has a CLI and TS API.

Files such as bw.workspace.ts and bw.root.ts may be present for configuration.

Use resources for docs on the CLI and TS API, or get a project overview via bw://project.
bw://docs/overview, bw://docs/concepts, bw://docs/cli, bw://docs/api, and bw://docs/config cover most functionality.

Use the tools to get specific metadata about the project.

## CLI quickstart
\`\`\`bash
$ alias bw="bunx bun-workspaces"
$ bw --help # usage
$ # run is an alias for run-script
$ bw run lint # run the "lint" script for all workspaces that have it
$ bw run "echo inline script" --inline # run an inline command via the Bun shell
$ bw run lint my-workspace-a my-workspace-b # run for specific workspaces
$ bw run lint --dep-order # run the lint script for all workspaces, waiting for all dependencies to complete
$ bw run lint "my-workspace-*" # wildcard for workspace names
$ bw run lint "alias:my-alias-*" "path:packages/**/*" "not:path:my-path/*" # use workspace patterns
\`\`\`

(end bun-workspaces MCP instructions)
`.trim();

export interface BwMcpServerOptions {
  initialWorkingDirectory: string;
}

export const startBwMcpServer = async (
  options: BwMcpServerOptions,
): Promise<void> => {
  setServerWorkingDirectory(options.initialWorkingDirectory);

  const server = createMcpServer({
    name: "bun-workspaces",
    version: packageJson.version,
    instructions: SERVER_INSTRUCTIONS,
  });

  registerBwTools(server);
  registerBwResources(server);

  await server.start();
};
