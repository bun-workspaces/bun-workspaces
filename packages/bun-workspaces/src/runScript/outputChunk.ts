import { sanitizeAnsi } from "../internal/core";

export type OutputStreamName = "stdout" | "stderr";

export interface DecodeOptions {
  /** Whether to strip ANSI escape codes */
  stripAnsi?: boolean;
}

/** Output captured from a script subprocess */
export interface OutputChunk {
  /** The source of the output, `"stdout"` or `"stderr"` */
  streamName: OutputStreamName;
  /** Raw output text. Pass `true` to strip ANSI escape codes. */
  decode(options?: DecodeOptions): string;
  /** The raw output content */
  raw: Uint8Array<ArrayBufferLike>;
  /** @deprecated Use `decode()` instead */
  // TODO remove in future major release
  text: string;
  /** @deprecated Use `decode({ stripAnsi: true })` instead */
  // TODO remove in future major release
  textNoAnsi: string;
}

class _OutputChunk implements OutputChunk {
  constructor(
    public readonly streamName: OutputStreamName,
    public readonly raw: Uint8Array<ArrayBufferLike>,
  ) {}

  decode(options?: DecodeOptions): string {
    const { stripAnsi = false } = options ?? {};
    const text = new TextDecoder().decode(this.raw);
    return stripAnsi ? sanitizeAnsi(text) : text;
  }

  /** @deprecated Use `decode()` instead */
  get text(): string {
    // TODO remove in future major release
    return this.decode();
  }

  /** @deprecated Use `decode({ stripAnsi: true })` instead */
  get textNoAnsi(): string {
    // TODO remove in future major release
    return this.decode({ stripAnsi: true });
  }
}

export const createOutputChunk = (
  streamName: OutputStreamName,
  raw: Uint8Array<ArrayBufferLike>,
): OutputChunk => new _OutputChunk(streamName, raw);
