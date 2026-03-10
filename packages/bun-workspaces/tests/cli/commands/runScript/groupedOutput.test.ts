import { Terminal } from "@xterm/headless";
import { describe, test } from "bun:test";

describe("grouped output", () => {
  test("should render grouped output", () => {
    const terminal = new Terminal();
    terminal.onData((data) => {
      console.log(data);
    });
    terminal.write("Hello, world!");
  });
});
