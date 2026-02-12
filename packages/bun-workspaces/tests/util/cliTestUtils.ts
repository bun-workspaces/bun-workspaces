import path from "path";
import { expect } from "bun:test";
import packageJson from "../../package.json";
import { getCliCommandConfig, type CliCommandName } from "../../src/cli";
import { createRawPattern } from "../../src/internal/core";
import { getProjectRoot, type TestProjectName } from "../fixtures/testProjects";

export const listCommandAndAliases = (commandName: CliCommandName) => {
  const config = getCliCommandConfig(commandName);
  return [config.command.split(/\s+/)[0], ...config.aliases];
};

export const USAGE_OUTPUT_PATTERN = new RegExp(
  createRawPattern(`Usage: bun-workspaces [options] [command]

A CLI on top of native Bun workspaces

Options:`) +
    "(.|\n)*" +
    createRawPattern(`Commands:\n`) +
    "(.|\n)*display help for command$",
  "m",
);

export interface SetupTestOptions {
  /** If provided, the test will be run in the project with the given name. Cannot be used together with workingDirectory. */
  testProject?: TestProjectName;
  /** If provided, the test will be run in the given working directory. Cannot be used together with testProject. */
  workingDirectory?: string;
  /** If provided, the test will be run with the given environment variables. */
  env?: Record<string, string>;
}

export interface OutputText {
  raw: string;
  sanitized: string;
  sanitizedCompactLines: string;
}

export interface OutputLine {
  text: OutputText;
  source: "stdout" | "stderr";
}

export interface RunResult {
  outputLines: OutputLine[];
  stdoutAndErr: OutputText;
  stdout: OutputText;
  stderr: OutputText;
  exitCode: number;
}

export interface SetupTestResult {
  run: (...argv: string[]) => Promise<RunResult>;
}

export const assertOutputMatches = (output: string, pattern: string | RegExp) =>
  expect(output.trim()).toMatch(
    pattern instanceof RegExp
      ? pattern
      : new RegExp("^" + createRawPattern(pattern.trim()) + "$", "i"),
  );

const blankOutputText: OutputText = {
  raw: "",
  sanitized: "",
  sanitizedCompactLines: "",
};

export const setupCliTest = (
  { testProject, workingDirectory, env }: SetupTestOptions = {
    testProject: "default",
  },
): SetupTestResult => {
  if (testProject && workingDirectory) {
    throw new Error("Cannot specify both testProject and workingDirectory");
  }

  const testProjectRoot =
    workingDirectory ?? getProjectRoot(testProject || "default");

  const sanitizeText = (text: string) =>
    // eslint-disable-next-line no-control-regex
    text.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "");

  const run = async (...argv: string[]) => {
    const subprocess = Bun.spawn(
      [
        "bun",
        path.resolve(__dirname, "../../", packageJson.bin["bun-workspaces"]),
        ...argv,
      ],
      {
        cwd: testProjectRoot,
        env: { ...process.env, ...env, FORCE_COLOR: "1" },
        stdout: "pipe",
        stderr: "pipe",
      },
    );

    const outputLines: OutputLine[] = [];
    const stdout: OutputText = { ...blankOutputText };
    const stderr: OutputText = { ...blankOutputText };
    const stdoutAndErr: OutputText = { ...blankOutputText };

    const appendOutputLine = (outputText: OutputText, line: string) => {
      outputText.raw += line + "\n";
      outputText.sanitized += sanitizeText(line) + "\n";
    };

    const pipeOutput = async (source: "stdout" | "stderr") => {
      const stream = subprocess[source];
      if (stream) {
        for await (const chunk of stream) {
          outputLines.push(
            ...new TextDecoder()
              .decode(chunk)
              .split("\n")
              .map((line) => {
                appendOutputLine(source === "stdout" ? stdout : stderr, line);
                appendOutputLine(stdoutAndErr, line);
                return {
                  text: {
                    raw: line,
                    sanitized: sanitizeText(line),
                    sanitizedCompactLines: sanitizeText(line),
                  },
                  source,
                };
              }),
          );
        }
      }
    };

    await Promise.all([pipeOutput("stdout"), pipeOutput("stderr")]);

    const sanitizeCompact = (outputText: OutputText) => {
      outputText.sanitizedCompactLines = outputText.sanitized.replace(
        /(\n+)/gm,
        "\n",
      );
      return outputText;
    };

    return {
      outputLines,
      stdoutAndErr: sanitizeCompact(stdoutAndErr),
      stdout: sanitizeCompact(stdout),
      stderr: sanitizeCompact(stderr),
      exitCode: await subprocess.exited,
    };
  };

  return { run };
};
