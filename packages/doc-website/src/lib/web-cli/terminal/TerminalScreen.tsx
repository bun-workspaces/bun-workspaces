import { FitAddon } from "@xterm/addon-fit";
import { Terminal as XTermTerminal, type ITheme } from "@xterm/xterm";
import { useEffect, useRef } from "react";
import { useThemeState } from "rspress/theme";
import "@xterm/xterm/css/xterm.css";
import { useWebCliResult } from "../util/invokeWebCli";
import { WEB_CLI_INPUT_ID } from "./TerminalInput";

export type TerminalSize = {
  cols: number;
  rows: number;
};

export type TerminalScreenProps = {
  onTerminalResize?: (size: TerminalSize) => void;
};

const getTerminalTheme = (): ITheme => {
  const computedStyle = getComputedStyle(document.documentElement);

  const getCssVariable = (name: string) =>
    computedStyle.getPropertyValue(name).trim();

  return {
    background: getCssVariable("--rp-c-code-block-bg"),
    foreground: getCssVariable("--rp-c-text-1"),
    cursor: "transparent",
    selectionBackground: getCssVariable("--rp-c-bg-soft"),
    black: getCssVariable("--web-cli-black"),
    red: getCssVariable("--web-cli-red"),
    green: getCssVariable("--web-cli-green"),
    yellow: getCssVariable("--web-cli-yellow"),
    blue: getCssVariable("--web-cli-blue"),
    magenta: getCssVariable("--web-cli-magenta"),
    cyan: getCssVariable("--web-cli-cyan"),
    white: getCssVariable("--rp-c-text-1"),
    brightBlack: getCssVariable("--web-cli-bright-black"),
    brightRed: getCssVariable("--web-cli-red"),
    brightGreen: getCssVariable("--web-cli-green"),
    brightYellow: getCssVariable("--web-cli-yellow"),
    brightBlue: getCssVariable("--web-cli-blue"),
    brightMagenta: getCssVariable("--web-cli-magenta"),
    brightCyan: getCssVariable("--web-cli-cyan"),
    brightWhite: getCssVariable("--rp-c-text-1"),
  };
};

export const TerminalScreen = ({ onTerminalResize }: TerminalScreenProps) => {
  const terminalDivRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTermTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const cliResult = useWebCliResult();
  const writtenChunksRef = useRef(0);

  const [theme] = useThemeState();

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.options.theme = getTerminalTheme();
    }
  }, [theme]);

  useEffect(() => {
    if (!terminalDivRef.current) return;

    const terminal = new XTermTerminal({
      disableStdin: true,
      cursorBlink: false,
      cursorWidth: 1,
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

    const payload = newChunks
      .map((chunk) => chunk.terminalOutput)
      .join("")
      .replaceAll("\n", "\r\n");
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
