import { createFileSystemProject } from "bun-workspaces_local";
import { createCli } from "bun-workspaces_local/src/cli";

if (import.meta.main && process.env.CLI === "true") {
  createCli({ defaultCwd: "test-project" }).run();
} else {
  const project = createFileSystemProject({
    rootDirectory: "test-project",
  });

  const { output, summary } = project.runScriptAcrossWorkspaces({
    workspacePatterns: ["workspace-a"],
    script: "echo hello from <workspaceName> && sleep 5",
    inline: true,
  });

  // for await (const { outputChunk } of output) {
  //   console.log(outputChunk.decode().trim());
  // }

  const summaryResult = await summary;
  console.log(summaryResult);
}
