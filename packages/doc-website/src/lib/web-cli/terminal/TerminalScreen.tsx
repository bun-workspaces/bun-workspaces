import { FitAddon } from "@xterm/addon-fit";
import { Terminal as XTermTerminal, type ITheme } from "@xterm/xterm";
import { useEffect, useRef } from "react";
import "@xterm/xterm/css/xterm.css";
import { useWebCliResult } from "../invokeWebCli";
import { WEB_CLI_INPUT_ID } from "./TerminalInput";

export type TerminalSize = {
  cols: number;
  rows: number;
};

export type TerminalScreenProps = {
  onTerminalResize?: (size: TerminalSize) => void;
};

const getCssVariable = (name: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const getTerminalTheme = (): ITheme => ({
  background: getCssVariable("--rp-c-code-block-bg"),
  foreground: getCssVariable("--rp-c-text-1"),
  cursor: "transparent",
  selectionBackground: getCssVariable("--rp-c-bg-soft"),
  black: "#1e1e1e",
  red: "#d65151",
  green: "#6a9f58",
  yellow: "#d6b35f",
  blue: "#5b7dd1",
  magenta: "#8f69c5",
  cyan: "#58a7b4",
  white: getCssVariable("--rp-c-text-1"),
  brightBlack: "#6b6b6b",
  brightRed: "#ff6a6a",
  brightGreen: "#8bcf71",
  brightYellow: "#ffd27a",
  brightBlue: "#86a7ff",
  brightMagenta: "#b38eff",
  brightCyan: "#84d9e8",
  brightWhite: "#f2f2f2",
});

export const TerminalScreen = ({ onTerminalResize }: TerminalScreenProps) => {
  const terminalDivRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTermTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const cliResult = useWebCliResult();
  const writtenChunksRef = useRef(0);

  useEffect(() => {
    if (!terminalDivRef.current) return;

    const terminal = new XTermTerminal({
      disableStdin: true,
      cursorBlink: false,
      allowTransparency: true,
      fontFamily: "var(--rp-font-family-mono)",
      fontSize: 16,
      lineHeight: 1.15,
      theme: getTerminalTheme(),
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(terminalDivRef.current);
    terminal.write("\x1b[?25l");

    const fitAndNotify = () => {
      fitAddon.fit();
      onTerminalResize?.({
        cols: terminal.cols,
        rows: terminal.rows,
      });
    };

    fitAndNotify();

    const resizeObserver = new ResizeObserver(() => {
      fitAndNotify();
    });
    resizeObserver.observe(terminalDivRef.current);

    const rootClassObserver = new MutationObserver(() => {
      terminal.options.theme = getTerminalTheme();
      fitAndNotify();
    });
    rootClassObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    return () => {
      rootClassObserver.disconnect();
      resizeObserver.disconnect();
      fitAddonRef.current = null;
      terminalRef.current = null;
      terminal.dispose();
    };
  }, [onTerminalResize]);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;

    if (cliResult.length === 0) {
      terminal.reset();
      terminal.write("\x1b[?25l");
      writtenChunksRef.current = 0;
      return;
    }

    const newChunks = cliResult.slice(writtenChunksRef.current);
    if (newChunks.length === 0) return;

    const payload = newChunks.map((chunk) => chunk.terminalOutput).join("");
    terminal.write(payload);
    writtenChunksRef.current = cliResult.length;
  }, [cliResult]);

  return (
    <div
      className="web-cli-terminal-screen-container"
      onClick={() => {
        const input = document.getElementById(WEB_CLI_INPUT_ID);
        if (input) {
          input.focus();
        }
      }}
    >
      <div className="web-cli-terminal-screen" ref={terminalDivRef} />
    </div>
  );
};
