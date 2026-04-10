import { logger } from "../../internal/logger";
import { startBwMcpServer } from "../../ai/mcp";
import { handleProjectCommand } from "./commandHandlerUtils";

export const mcp = handleProjectCommand("mcp", async ({ project }) => {
  logger.printLevel = "silent";
  await startBwMcpServer(project);
});
