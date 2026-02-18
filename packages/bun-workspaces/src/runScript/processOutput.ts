import {
  BunWorkspacesError,
  type SimpleAsyncIterable,
  createAsyncIterableQueue,
  defineErrors,
} from "../internal/core";

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

    this.#done = new Promise((resolve, reject) => {
      this.#onDone = (error) => {
        if (this.#isDone) return;
        this.#isDone = true;
        this.#byteChunkQueue.close();
        this.#onDone = null;

        if (!this.isCancelled && error) {
          reject(error);
        } else {
          resolve();
        }
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
        this.#error = error as Error;
      } finally {
        this.#onDone?.(this.#error);
      }
    })();
  }

  get done(): Promise<void> {
    return this.#done;
  }

  get isCancelled(): boolean {
    return this.#isCancelled;
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

  async cancel(reason?: unknown) {
    this.#isCancelled = true;
    this.#onDone?.();
    await (this.#inputStream as ReadableStream).cancel?.(reason);
  }

  get isDone(): boolean {
    return this.#isDone;
  }

  get error(): Error | null {
    return this.#error;
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
  #error: Error | null = null;
  #onDone: ((error?: Error | null) => void) | null = null;
  #isDone = false;
  #isCancelled = false;
  #inputStream: ByteStream;
  #byteChunkQueue = createAsyncIterableQueue<Uint8Array<ArrayBufferLike>>();
}

export const createProcessOutput = (stream: ByteStream): ProcessOutput =>
  new _ProcessOutput(stream);
