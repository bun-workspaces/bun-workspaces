import type {
  RunScriptAcrossWorkspacesProcessOutput,
  RunWorkspaceScriptMetadata,
} from "../../../../project";
import type { OutputStreamName } from "../../../../runScript";
import { sanitizeChunk } from "./sanitizeChunk";

export type RenderPlainOutputOptions = {
  stripDisruptiveControls?: boolean;
  prefix?: boolean;
  scriptName: string;
};

export async function* renderPlainOutput(
  output: RunScriptAcrossWorkspacesProcessOutput,
  {
    scriptName,
    stripDisruptiveControls = true,
    prefix = false,
  }: RenderPlainOutputOptions,
): AsyncGenerator<{
  line: string;
  metadata: RunWorkspaceScriptMetadata & { streamName: OutputStreamName };
}> {
  const workspaceLineBuffers: Record<string, string> = {};

  const formatLine = (
    line: string,
    workspaceName: string,
    scriptName: string,
  ) => {
    const prefixedLine = prefix
      ? `[${workspaceName}:${scriptName}] ${line}`
      : line;
    return `\x1b[0m${prefixedLine}\n`;
  };

  for await (const { metadata, chunk } of output.text()) {
    const workspaceName = metadata.workspace.name;
    const sanitizedChunk = sanitizeChunk(chunk, stripDisruptiveControls);

    const prior = workspaceLineBuffers[workspaceName] ?? "";

    const content = prior + sanitizedChunk;
    const lines = content.split("\n");

    for (const line of lines) {
      if (line)
        yield {
          line: formatLine(line, workspaceName, scriptName),
          metadata,
        };
    }

    workspaceLineBuffers[workspaceName] = content.endsWith("\n")
      ? ""
      : (lines[lines.length - 1] ?? "");
  }
}
