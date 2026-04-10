const MCP_SERVER_NAME = "bun-workspaces";

/** Server entry for GUI apps that don't inherit shell PATH (Cursor, Claude Desktop) */
export const MCP_SERVER_ENTRY_GUI = {
  command: "/bin/sh",
  args: [
    "-c",
    'PATH="$HOME/.bun/bin:$PATH" exec bunx bun-workspaces mcp-server',
  ],
};

/** Server entry for terminal apps that inherit shell PATH (Claude Code) */
export const MCP_SERVER_ENTRY_TERMINAL = {
  command: "bunx",
  args: ["bun-workspaces", "mcp-server"],
};

const mcpConfig = (
  entry: typeof MCP_SERVER_ENTRY_GUI | typeof MCP_SERVER_ENTRY_TERMINAL,
) => ({
  mcpServers: {
    [MCP_SERVER_NAME]: entry,
  },
});

export const CURSOR_MCP_CONFIG = mcpConfig(MCP_SERVER_ENTRY_GUI);

export const CLAUDE_DESKTOP_MCP_CONFIG = mcpConfig(MCP_SERVER_ENTRY_GUI);

export const CLAUDE_CODE_MCP_CONFIG = mcpConfig(MCP_SERVER_ENTRY_TERMINAL);

/** .cursor/mcp.json (project-local) or ~/.cursor/mcp.json (global) */
export const CURSOR_MCP_CONFIG_PATH = ".cursor/mcp.json";

/** Project-local .mcp.json at the repo root */
export const CLAUDE_CODE_MCP_CONFIG_PATH = ".mcp.json";
