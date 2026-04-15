import { mergeAsyncIterables } from "../../internal/core";
import {
  type ProcessOutput,
  type BytesOutput,
  type TextOutput,
} from "./processOutput";

export interface MultiProcessOutput<Metadata extends object = object> {
  bytes(): BytesOutput<Metadata>;
  text(): TextOutput<Metadata>;
}

class _MultiProcessOutput<
  Metadata extends object = object,
> implements MultiProcessOutput<Metadata> {
  constructor(private readonly processes: ProcessOutput<Metadata>[]) {}

  bytes(): BytesOutput<Metadata> {
    return mergeAsyncIterables(
      this.processes.map((process) => process.bytes()),
    );
  }

  text(): TextOutput<Metadata> {
    return mergeAsyncIterables(this.processes.map((process) => process.text()));
  }
}

export const createMultiProcessOutput = <Metadata extends object = object>(
  processes: ProcessOutput<Metadata>[],
): MultiProcessOutput<Metadata> => new _MultiProcessOutput(processes);
