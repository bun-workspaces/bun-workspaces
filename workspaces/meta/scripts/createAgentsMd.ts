import path from "path";
import { createAgentDocs } from "../util/agentDocs";

if (import.meta.main) {
  const { logger, combinedContent } = await createAgentDocs({
    scriptName: "AGENTS.md",
    includeDevDocs: true,
  });

  logger.info("Writing to AGENTS.md");
  await Bun.write(
    path.resolve(process.env.BW_PROJECT_PATH as string, "AGENTS.md"),
    combinedContent,
  );
  logger.info("Success");
}
