import packageJson from "../../../package.json";
import type { FileSystemProject } from "../../project/implementations/fileSystemProject";
import { createMcpServer } from "./core";
import { registerBwResources } from "./resources";
import { registerBwTools } from "./tools";

const SERVER_INSTRUCTIONS = `bun-workspaces provided MCP server. Provides tools to query Bun monorepo workspace metadata
and documentation resources for the bun-workspaces CLI and TS API.
bun-workspaces is an npm package that works on top of Bun's native workspaces.
If this server is running, likely the project has bun-workspace installed, or the user
uses the CLI via bunx, perhaps using suggested alias "bw" for \`bunx bun-workspaces\`.
Running scripts across workspaces is a core bw feature not exposed as a tool —
use the CLI directly (e.g. \`bw run <script> [patterns...]\`).
See the bw://docs/cli resource for the full CLI reference including all run-script options.`;

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
