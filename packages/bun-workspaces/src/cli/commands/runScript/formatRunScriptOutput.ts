import type { RunScriptAcrossWorkspacesProcessOutput } from "../../../project";

export type FormatRunScriptOutputOptions = {
  prefix?: boolean;
};

export async function* formatRunScriptOutput(
  output: RunScriptAcrossWorkspacesProcessOutput,
  { prefix = false }: FormatRunScriptOutputOptions = {},
) {
  let lastWorkspaceName = null;
  let lineBuffer = "";
  const formatLine = (line: string, workspaceName: string) => {
    const prefixedLine = prefix ? `[${workspaceName}] ${line}` : line;
    return `\x1b[0m${prefixedLine}`;
  };
  for await (const { metadata, chunk } of output.text()) {
    if (metadata.workspace.name !== lastWorkspaceName) {
      lastWorkspaceName = metadata.workspace.name;
      lineBuffer = "";
    }
  }
}
