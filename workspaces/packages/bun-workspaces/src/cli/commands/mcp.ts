import { startBwMcpServer } from "../../ai/mcp";
import { logger } from "../../internal/logger";
import { handleGlobalCommand } from "./commandHandlerUtils";

export const mcpServer = handleGlobalCommand(
  "mcpServer",
  async ({ workingDirectory }) => {
    logger.printLevel = "silent";
    await startBwMcpServer({ initialWorkingDirectory: workingDirectory });
  },
);
