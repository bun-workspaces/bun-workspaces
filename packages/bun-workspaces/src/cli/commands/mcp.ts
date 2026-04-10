import { logger } from "../../internal/logger";
import { startBwMcpServer } from "../../ai/mcp";
import { handleProjectCommand } from "./commandHandlerUtils";

export const mcp = handleProjectCommand("mcp", async ({ project }) => {
  logger.printLevel = "silent";

  // Ensure clean exit when the client disconnects or a termination signal fires.
  // The onExit handlers (temp file cleanup) register a SIGINT handler that re-raises
  // after cleanup — adding an explicit exit here ensures the process terminates
  // promptly without leaving the inspector's proxy ports open.
  process.on("SIGINT", () => process.exit(0));
  process.on("SIGTERM", () => process.exit(0));

  await startBwMcpServer(project);
  process.exit(0);
});
