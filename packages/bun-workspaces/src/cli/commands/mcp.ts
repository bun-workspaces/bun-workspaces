import { startBwMcpServer } from "../../ai/mcp";
import { logger } from "../../internal/logger";
import { handleProjectCommand } from "./commandHandlerUtils";

export const mcpServer = handleProjectCommand(
  "mcpServer",
  async ({ project }) => {
    logger.printLevel = "silent";
    await startBwMcpServer(project);
  },
);
