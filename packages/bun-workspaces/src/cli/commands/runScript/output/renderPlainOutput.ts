import type { RunScriptAcrossWorkspacesProcessOutput } from "../../../../project";
import { sanitizeChunk } from "./sanitizeChunk";

export type RenderPlainOutputOptions = {
  stripDisruptiveControls?: boolean;
  prefix?: boolean;
};

export const renderPlainOutput = async (
  output: RunScriptAcrossWorkspacesProcessOutput,
  { stripDisruptiveControls = true, prefix = false }: RenderPlainOutputOptions,
) => {
  const workspaceLineBuffers: Record<string, string> = {};

  const formatLine = (line: string, workspaceName: string) => {
    const prefixedLine = prefix ? `[${workspaceName}] ${line}` : line;
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
        process[metadata.streamName].write(formatLine(line, workspaceName));
    }

    workspaceLineBuffers[workspaceName] = content.endsWith("\n")
      ? ""
      : (lines[lines.length - 1] ?? "");
  }
};
