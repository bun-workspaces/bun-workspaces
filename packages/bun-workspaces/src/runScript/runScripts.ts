import {
  createAsyncIterableQueue,
  type SimpleAsyncIterable,
} from "../internal/core";
import { logger } from "../internal/logger";
import {
  createMultiProcessOutput,
  type MultiProcessOutput,
} from "./output/multiProcessOutput";
import { createProcessOutput, type ByteChunk } from "./output/processOutput";
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

export type RunScriptsScript<ScriptMetadata extends object = object> = {
  scriptCommand: ScriptCommand;
  metadata: ScriptMetadata;
  env: Record<string, string>;
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
  scriptMetadata: ScriptMetadata;
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
};

/** Run a list of scripts */
export const runScripts = <ScriptMetadata extends object = object>({
  scripts,
  parallel,
}: RunScriptsOptions<ScriptMetadata>): RunScriptsResult<ScriptMetadata> => {
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

  let runningScriptCount = 0;
  let nextScriptIndex = 0;
  const queueScript = (index: number) => {
    if (runningScriptCount >= parallelMax) {
      return;
    }

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

    scriptTriggers[index].trigger();

    runningScriptCount++;
    nextScriptIndex++;

    scriptResults[index].result.exit.then(() => {
      runningScriptCount--;
      if (nextScriptIndex < scripts.length) {
        queueScript(nextScriptIndex);
      }
    });

    return scriptResult;
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
          for await (const chunk of scriptResults[
            index
          ].result.processOutput.bytes()) {
            outputQueue.push({
              outputChunk: createOutputChunk(
                chunk.metadata.streamName,
                chunk.chunk,
              ),
              scriptMetadata: scripts[index].metadata,
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
  };

  const awaitSummary = async () => {
    scripts.forEach((_, index) => queueScript(index));

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
