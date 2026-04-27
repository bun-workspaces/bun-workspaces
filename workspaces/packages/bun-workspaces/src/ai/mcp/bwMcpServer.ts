import packageJson from "../../../package.json";
import { createMcpServer } from "./core";
import { registerBwResources } from "./resources";
import { setServerWorkingDirectory } from "./serverState";
import { registerBwTools } from "./tools";

const SERVER_INSTRUCTIONS = `
bun-workspaces ${packageJson.version} MCP server: tools to query Bun monorepo workspace metadata and documentation resources for the bun-workspaces CLI and TypeScript API.

bun-workspaces is an npm package that works on top of Bun's native workspaces. It has a CLI and TS API.

Files such as bw.workspace.ts and bw.root.ts may be present for configuration.

Use resources to understand the CLI and TS API and get a project overview.

Use the tools to get specific metadata about the project.

Running scripts across workspaces is a core bw feature not exposed as a tool — use the CLI directly.

## CLI quickstart

\`\`\`bash
$ alias bw="bunx bun-workspaces"
$ bw --help
$ bw ls --help # list workspaces 
$ bw run-script --help # run a script across workspaces
$ bw workspace-info --help # get info about a workspace
$ bw script-info --help # get info about a script
$ bw list-tags --help # list all tags
$ bw tag-info --help # get info about a tag
$
$ # run is an alias for run-script
$ bw run lint # run the lint script for all workspaces that have it
$ bw run lint my-workspace-a my-workspace-b # run the lint script for specific workspaces
$ bw run lint --dep-order # run the lint script for all workspaces, waiting for all dependencies to complete
$ bw run lint "my-workspace-*" # run the lint script for workspaces using wildcard that matches the workspace name
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
