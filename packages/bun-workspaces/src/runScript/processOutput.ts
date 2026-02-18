import {
  BunWorkspacesError,
  type SimpleAsyncIterable,
  createAsyncIterableQueue,
  defineErrors,
} from "../internal/core";
import { logger } from "../internal/logger";

export type ByteStream = SimpleAsyncIterable<Uint8Array<ArrayBufferLike>>;

export type TextStream = SimpleAsyncIterable<string>;

export interface ProcessOutput {
  bytes(): ByteStream;
  text(): TextStream;
}

const ERRORS = defineErrors(
  BunWorkspacesError,
  "OutputStreamStarted",
  "OutputStreamDone",
);

class _ProcessOutput implements ProcessOutput {
  constructor(stream: ByteStream) {
    this.#inputStream = stream;

    this.#done = new Promise((resolve) => {
      this.#onDone = () => {
        if (this.#isDone) return;
        this.#isDone = true;
        this.#byteChunkQueue.close();
        resolve();
      };
    });

    (async () => {
      // Drain the stream immediately to prevent pipe buffer overflow from subprocesses,
      // the queue acting as a() forwarded async iterable in a way.
      try {
        for await (const chunk of stream) {
          if (this.#isCancelled) break;
          this.#byteChunkQueue.push(chunk.slice());
        }
      } catch (error) {
        logger.error(error as Error);
      } finally {
        this.#onDone?.();
      }
    })();
  }

  get done(): Promise<void> {
    return this.#done;
  }

  bytes(): ByteStream {
    this.#onStart();

    return this.#byteChunkQueue;
  }

  text(): TextStream {
    this.#onStart();

    const byteStream = this.#byteChunkQueue;
    return (async function* () {
      const decoder = new TextDecoder();
      for await (const chunk of byteStream) {
        yield decoder.decode(chunk, { stream: true });
      }
      const flushed = decoder.decode();
      if (flushed) yield flushed;
    })();
  }

  cancel(reason?: unknown) {
    this.#isCancelled = true;
    (this.#inputStream as ReadableStream).cancel?.(reason).finally(() => {
      this.#onDone?.();
    });
  }

  get isDone(): boolean {
    return this.#isDone;
  }

  #onStart(): void {
    if (this.#isDone) {
      throw new ERRORS.OutputStreamDone(
        "The output stream has already been closed.",
      );
    }
    if (this.#isStarted) {
      throw new ERRORS.OutputStreamStarted(
        "Only one stream can be opened via .bytes() or .text(). This stream has already been opened.",
      );
    }
    this.#isStarted = true;
  }

  #isStarted = false;
  #done: Promise<void>;
  #onDone: (() => void) | null = null;
  #isDone = false;
  #isCancelled = false;
  #inputStream: ByteStream;
  #byteChunkQueue = createAsyncIterableQueue<Uint8Array<ArrayBufferLike>>();
}

export const createProcessOutput = (stream: ByteStream): ProcessOutput =>
  new _ProcessOutput(stream);
