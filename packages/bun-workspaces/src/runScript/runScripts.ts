import {
  createAsyncIterableQueue,
  type SimpleAsyncIterable,
} from "../internal/core";
import { logger } from "../internal/logger";
import {
  createMultiProcessOutput,
  type MultiProcessOutput,
} from "./output/multiProcessOutput";
import { createProcessOutput, type BytesOutput } from "./output/processOutput";
import {
  createOutputChunk,
  type OutputChunk,
  type OutputStreamName,
} from "./outputChunk";
import { determineParallelMax, type ParallelMaxValue } from "./parallel";
import {
  runScript,
  type RunScriptExit,
  type RunScriptResult,
} from "./runScript";
import { type ScriptCommand } from "./scriptCommand";
import { type ScriptShellOption } from "./scriptShellOption";

export type RunScriptsScript<ScriptMetadata extends object = object> = {
  scriptCommand: ScriptCommand;
  metadata: ScriptMetadata;
  env: Record<string, string>;
  /** The shell to use to run the script */
  shell?: ScriptShellOption;
  /** Indices of other scripts in the array that must complete before this one starts */
  dependsOn?: number[];
};

export type RunScriptsScriptResult<ScriptMetadata extends object = object> = {
  /** The result of running the script */
  result: RunScriptResult<ScriptMetadata>;
};

export type RunScriptsSummary<ScriptMetadata extends object = object> = {
  totalCount: number;
  successCount: number;
  failureCount: number;
  allSuccess: boolean;
  startTimeISO: string;
  endTimeISO: string;
  durationMs: number;
  scriptResults: RunScriptExit<ScriptMetadata>[];
};

/** @deprecated */
export type RunScriptsOutput<ScriptMetadata extends object = object> = {
  /** The output chunk from a script execution */
  outputChunk: OutputChunk;
  /** The metadata for the script that produced the output chunk */
  scriptMetadata: ScriptMetadata & { streamName: OutputStreamName };
};

export type RunScriptsResult<ScriptMetadata extends object = object> = {
  /** @deprecated Allows async iteration of output chunks from all script executions */
  output: SimpleAsyncIterable<RunScriptsOutput<ScriptMetadata>>;
  processOutput: MultiProcessOutput<
    ScriptMetadata & { streamName: OutputStreamName }
  >;
  /** Resolves with a results summary after all scripts have exited */
  summary: Promise<RunScriptsSummary<ScriptMetadata>>;
};

export type RunScriptsParallelOptions = {
  max: ParallelMaxValue;
};

export type RunScriptsOptions<ScriptMetadata extends object = object> = {
  scripts: RunScriptsScript<ScriptMetadata>[];
  parallel: boolean | RunScriptsParallelOptions;
  /** When true, run scripts even if a dependency failed. Default: false (skip them). */
  ignoreDependencyFailure?: boolean;
};

/** Validate dependency indices and detect cycles via DFS */
const validateScriptDependencies = (
  scripts: { dependsOn?: number[] }[],
): void => {
  const scriptCount = scripts.length;

  for (let i = 0; i < scriptCount; i++) {
    const deps = scripts[i].dependsOn;
    if (!deps) continue;

    for (const dep of deps) {
      if (dep === i) {
        throw new Error(
          `Script at index ${i} has a self-referencing dependency`,
        );
      }
      if (dep < 0 || dep >= scriptCount) {
        throw new Error(
          `Script at index ${i} depends on invalid index ${dep} (valid range: 0-${scriptCount - 1})`,
        );
      }
    }
  }

  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const colors = new Array<number>(scriptCount).fill(WHITE);

  const visit = (node: number, path: number[]): void => {
    colors[node] = GRAY;
    const deps = scripts[node].dependsOn;
    if (deps) {
      for (const dep of deps) {
        if (colors[dep] === GRAY) {
          const cycleStart = path.indexOf(dep);
          const cycle = path.slice(cycleStart);
          throw new Error(
            `Dependency cycle detected: ${[...cycle, dep].join(" -> ")}`,
          );
        }
        if (colors[dep] === WHITE) {
          visit(dep, [...path, dep]);
        }
      }
    }
    colors[node] = BLACK;
  };

  for (let i = 0; i < scriptCount; i++) {
    if (colors[i] === WHITE) {
      visit(i, [i]);
    }
  }
};

/** Run a list of scripts */
export const runScripts = <ScriptMetadata extends object = object>({
  scripts,
  parallel,
  ignoreDependencyFailure = false,
}: RunScriptsOptions<ScriptMetadata>): RunScriptsResult<ScriptMetadata> => {
  validateScriptDependencies(scripts);

  const startTime = new Date();

  type ScriptTrigger = {
    promise: Promise<ScriptTrigger>;
    trigger: () => void;
    index: number;
  };

  const scriptTriggers: ScriptTrigger[] = scripts.map((_, index) => {
    let trigger: () => void = () => {
      void 0;
    };

    const promise = new Promise<ScriptTrigger>((res) => {
      trigger = () => res(result);
    });

    const result: ScriptTrigger = {
      promise,
      trigger,
      index,
    };

    return result;
  });

  /** @deprecated */
  const outputQueue =
    createAsyncIterableQueue<RunScriptsOutput<ScriptMetadata>>();

  const scriptResults: RunScriptsScriptResult<ScriptMetadata>[] = scripts.map(
    () => null as never as RunScriptsScriptResult<ScriptMetadata>,
  );

  const parallelMax =
    parallel === false
      ? 1
      : determineParallelMax(
          typeof parallel === "boolean" ? "default" : parallel.max,
        );

  const parallelBatchSize = Math.min(parallelMax, scripts.length);
  const recommendedParallelMax = determineParallelMax("auto");
  if (
    parallel &&
    parallelBatchSize > recommendedParallelMax &&
    process.env._BW_IS_INTERNAL_TEST !== "true"
  ) {
    logger.warn(
      `Number of scripts to run in parallel (${parallelBatchSize}) is greater than the available CPUs (${recommendedParallelMax})`,
    );
  }

  const pendingScripts = new Set<number>(scripts.map((_, i) => i));
  const runningScripts = new Set<number>();
  const completedScripts = new Set<number>();
  const exitResults: (RunScriptExit<ScriptMetadata> | null)[] = scripts.map(
    () => null,
  );

  // Eagerly-created output iterators to prevent race condition where a fast
  // process completes and its ProcessOutput stream is fully drained before
  // handleScriptProcesses calls .bytes() (which throws OutputStreamDone).
  type ScriptProcessBytes = BytesOutput<
    ScriptMetadata & { streamName: OutputStreamName }
  >;
  const scriptProcessBytes: (ScriptProcessBytes | null)[] = scripts.map(
    () => null,
  );

  const createSkippedExit = (index: number): RunScriptExit<ScriptMetadata> => {
    const now = new Date().toISOString();
    return {
      exitCode: -1,
      signal: null,
      success: false,
      skipped: true,
      startTimeISO: now,
      endTimeISO: now,
      durationMs: 0,
      metadata: scripts[index].metadata,
    };
  };

  const createSkippedResult = (
    index: number,
  ): RunScriptsScriptResult<ScriptMetadata> => {
    const skippedExit = createSkippedExit(index);
    exitResults[index] = skippedExit;
    return {
      result: {
        output: (async function* () {
          /* empty */
        })(),
        processOutput: createMultiProcessOutput([]),
        exit: Promise.resolve(skippedExit),
        metadata: scripts[index].metadata,
        kill: () => {
          /* empty */
        },
      },
    };
  };

  const hasDependencyFailure = (index: number): boolean => {
    const deps = scripts[index].dependsOn;
    if (!deps) return false;
    return deps.some(
      (dep) => exitResults[dep] !== null && !exitResults[dep]!.success,
    );
  };

  const areDependenciesMet = (index: number): boolean => {
    const deps = scripts[index].dependsOn;
    if (!deps) return true;
    return deps.every((dep) => completedScripts.has(dep));
  };

  const scheduleReadyScripts = () => {
    let changed = true;
    while (changed) {
      changed = false;
      for (const index of [...pendingScripts]) {
        if (runningScripts.size >= parallelMax) return;
        if (!areDependenciesMet(index)) continue;

        if (!ignoreDependencyFailure && hasDependencyFailure(index)) {
          pendingScripts.delete(index);
          completedScripts.add(index);
          scriptResults[index] = createSkippedResult(index);
          scriptProcessBytes[index] = (async function* () {
            /* empty */
          })();
          scriptTriggers[index].trigger();
          changed = true;
          continue;
        }

        pendingScripts.delete(index);
        runningScripts.add(index);

        const scriptResult = {
          ...scripts[index],
          result: runScript({
            ...scripts[index],
            env: {
              ...scripts[index].env,
              _BW_PARALLEL_MAX: parallelMax.toString(),
            },
          }),
        };

        scriptResults[index] = scriptResult;
        scriptProcessBytes[index] = scriptResult.result.processOutput.bytes();
        scriptTriggers[index].trigger();

        scriptResult.result.exit.then((exit) => {
          runningScripts.delete(index);
          completedScripts.add(index);
          exitResults[index] = exit;
          scheduleReadyScripts();
        });
      }
    }
  };

  const scriptOutputQueues = scripts.map(() =>
    ["stdout", "stderr"].map(() =>
      createAsyncIterableQueue<Uint8Array<ArrayBufferLike>>(),
    ),
  );

  const multiProcessOutput = createMultiProcessOutput<
    ScriptMetadata & { streamName: OutputStreamName }
  >(
    scriptOutputQueues.flatMap(([stdout, stderr], index) => [
      createProcessOutput(stdout, {
        ...scripts[index].metadata,
        streamName: "stdout",
      }),
      createProcessOutput(stderr, {
        ...scripts[index].metadata,
        streamName: "stderr",
      }),
    ]),
  );

  const handleScriptProcesses = async () => {
    /** @deprecated */
    const outputReaders: Promise<void>[] = [];
    const scriptExits: Promise<void>[] = [];

    let pendingScriptCount = scripts.length;
    while (pendingScriptCount > 0) {
      const { index } = await Promise.race(
        scriptTriggers.map((trigger) => trigger.promise),
      );

      pendingScriptCount--;

      scriptTriggers[index].promise = new Promise<never>(() => {
        void 0;
      });

      outputReaders.push(
        (async () => {
          for await (const chunk of scriptProcessBytes[index]!) {
            outputQueue.push({
              outputChunk: createOutputChunk(
                chunk.metadata.streamName,
                chunk.chunk,
              ),
              scriptMetadata: {
                ...scripts[index].metadata,
                streamName: chunk.metadata.streamName,
              },
            });

            scriptOutputQueues[index][
              chunk.metadata.streamName === "stdout" ? 0 : 1
            ].push(chunk.chunk);
          }
        })(),
      );
    }

    await Promise.all(outputReaders);
    await Promise.all(scriptExits);
    outputQueue.close();
    scriptOutputQueues.forEach(([stdout, stderr]) => {
      stdout.close();
      stderr.close();
    });
  };

  const awaitSummary = async () => {
    scheduleReadyScripts();

    await handleScriptProcesses();

    const scriptExitResults = await Promise.all(
      scripts.map((_, index) => scriptResults[index].result.exit),
    );

    const endTime = new Date();

    return {
      totalCount: scriptExitResults.length,
      successCount: scriptExitResults.filter((exit) => exit.success).length,
      failureCount: scriptExitResults.filter((exit) => !exit.success).length,
      allSuccess: scriptExitResults.every((exit) => exit.success),
      startTimeISO: startTime.toISOString(),
      endTimeISO: endTime.toISOString(),
      durationMs: endTime.getTime() - startTime.getTime(),
      scriptResults: scriptExitResults,
    };
  };

  return {
    output: outputQueue,
    processOutput: multiProcessOutput,
    summary: awaitSummary(),
  };
};
