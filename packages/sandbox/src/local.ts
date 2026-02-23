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

  // Get a stream of the script subprocess's output
  for await (const { chunk, metadata } of output.text()) {
    console.log(chunk); // the content (string)
    console.log(metadata.streamName); // "stdout" or "stderr"
    console.log(metadata.workspace); // the workspace that the output came from
  }

  const summaryResult = await summary;
  console.log(summaryResult);
}
