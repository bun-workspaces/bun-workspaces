import { startBwMcpServer } from "../../ai/mcp";
import { logger } from "../../internal/logger";
import { handleProjectCommand } from "./commandHandlerUtils";

export const mcp = handleProjectCommand("mcp", async ({ project }) => {
  logger.printLevel = "silent";
  await startBwMcpServer(project);
});
