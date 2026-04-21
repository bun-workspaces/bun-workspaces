import {
  API_QUICKSTART,
  CLI_QUICKSTART,
  ROOT_CONFIG_QUICKSTART,
  WORKSPACE_CONFIG_QUICKSTART,
} from "bw-common/docs";
import packageJson from "../../../package.json";
import type { FileSystemProject } from "../../project/implementations/fileSystemProject";
import { createMcpServer } from "./core";
import { registerBwResources } from "./resources";
import { registerBwTools } from "./tools";

const SERVER_INSTRUCTIONS = `
bun-workspaces MCP server: tools to query Bun monorepo workspace metadata and documentation resources for the bun-workspaces CLI and TypeScript API.

bun-workspaces is an npm package that works on top of Bun's native workspaces. If this server is running, the project likely has bun-workspaces installed, or the user invokes it via bunx — often using the recommended alias "bw" for \`bunx bun-workspaces\`.

Use the tools to understand the project's workspaces and scripts. Running scripts across workspaces is a core bw feature not exposed as a tool — use the CLI directly. See the bw://docs/cli resource for the full CLI reference.

There are optional configuration files for the bun-workspaces CLI and TypeScript API. See the bw://docs/config resource for the full configuration reference.

## CLI quickstart

\`\`\`bash
${CLI_QUICKSTART}
\`\`\`

## API quickstart

\`\`\`typescript
${API_QUICKSTART}
\`\`\`

## Root config quickstart

\`\`\`typescript
${ROOT_CONFIG_QUICKSTART}
\`\`\`

## Workspace config quickstart

\`\`\`typescript
${WORKSPACE_CONFIG_QUICKSTART}
\`\`\`
`.trim();

export const startBwMcpServer = async (
  project: FileSystemProject,
): Promise<void> => {
  const server = createMcpServer({
    name: "bun-workspaces",
    version: packageJson.version,
    instructions: SERVER_INSTRUCTIONS,
  });

  registerBwTools(server, project);
  registerBwResources(server, project);

  await server.start();
};
