import readline from "readline";

export type RawMessage = Record<string, unknown>;

export type McpTransport = {
  receive: () => AsyncGenerator<RawMessage>;
  send: (message: RawMessage) => void;
};

export const createStdioTransport = (): McpTransport => {
  const send = (message: RawMessage): void => {
    process.stdout.write(JSON.stringify(message) + "\n");
  };

  const receive = async function* (): AsyncGenerator<RawMessage> {
    const rl = readline.createInterface({
      input: process.stdin,
      terminal: false,
    });

    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        yield JSON.parse(trimmed) as RawMessage;
      } catch {
        // Ignore malformed lines — the client sent invalid JSON
      }
    }
  };

  return { send, receive };
};
