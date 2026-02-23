import type {
  RunScriptAcrossWorkspacesProcessOutput,
  RunWorkspaceScriptMetadata,
} from "../../../project";
import type { OutputStreamName } from "../../../runScript";

export type FormatRunScriptOutputOptions = {
  prefix?: boolean;
  scriptName: string;
};

const sanitizeChunk = (input: string) => {
  // 1) Normalize newline-ish controls
  let s = input
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\f/g, "\n")
    .replace(/\v/g, "\n");

  // 2) Remove disruptive single-byte controls (except \n, \t)
  //    - backspace, bell, and C1 controls
  // eslint-disable-next-line no-control-regex
  s = s.replace(/[\b\x07\x80-\x9F]/g, "");

  // 3) Strip ANSI sequences, keeping only SGR (CSI ... m)
  //
  // We'll scan rather than rely on one giant regex so we can:
  // - keep SGR exactly
  // - drop any other ESC sequence
  // - handle incomplete ESC sequences conservatively (drop the ESC byte itself)
  //
  // ESC = \x1B
  const ESC = "\x1B";

  let out = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch !== ESC) {
      out += ch;
      continue;
    }

    // If ESC is last char, drop it
    if (i + 1 >= s.length) break;

    const next = s[i + 1];

    // Keep only CSI ... m  (ESC [ ... m)
    if (next === "[") {
      // Find final byte of CSI sequence (per spec: 0x40-0x7E).
      // We only keep it if the final byte is 'm'.
      let j = i + 2;
      while (j < s.length) {
        const code = s.charCodeAt(j);
        if (code >= 0x40 && code <= 0x7e) break; // final byte
        j++;
      }

      // If we didn't find a final byte, drop the ESC and stop (incomplete)
      if (j >= s.length) break;

      const finalByte = s[j];
      if (finalByte === "m") {
        // Keep full SGR sequence
        out += s.slice(i, j + 1);
      }
      // else: drop the entire CSI sequence

      i = j; // advance past sequence
      continue;
    }

    // All other ESC sequences: drop them.
    //
    // For 2-byte sequences (like ESC c), we can just drop ESC+next.
    // For string-terminated families (OSC/DCS/APC/PM/SOS), we should skip until terminator.
    //
    // OSC: ESC ] ... (BEL or ESC \)
    // DCS: ESC P ... (ST = ESC \)
    // APC: ESC _ ... (ST)
    // PM : ESC ^ ... (ST)
    // SOS: ESC X ... (ST)
    if (
      next === "]" ||
      next === "P" ||
      next === "_" ||
      next === "^" ||
      next === "X"
    ) {
      let j = i + 2;

      while (j < s.length) {
        const c = s[j];

        // BEL terminator (OSC can end with BEL)
        if (c === "\x07") {
          j++;
          break;
        }

        // ST terminator: ESC \
        if (c === ESC && j + 1 < s.length && s[j + 1] === "\\") {
          j += 2;
          break;
        }

        j++;
      }

      i = j - 1; // -1 because loop will i++
      continue;
    }

    // Fallback: treat as a 2-byte escape and drop ESC + next.
    i += 1;
  }

  return out;
};

export async function* formatRunScriptOutput(
  output: RunScriptAcrossWorkspacesProcessOutput,
  { scriptName, prefix = false }: FormatRunScriptOutputOptions,
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
    const sanitizedChunk = chunk;

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
