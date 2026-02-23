import { describe, test, expect } from "bun:test";
import { createAsyncIterableQueue } from "../../../src/internal/core";
import { createMultiProcessOutput } from "../../../src/runScript/output/multiProcessOutput";
import { createProcessOutput } from "../../../src/runScript/output/processOutput";

const createTestProcess = (name: string) => {
  const metadata = { name };
  const testStream = createAsyncIterableQueue<Uint8Array<ArrayBufferLike>>();
  const processOutput = createProcessOutput(testStream, metadata);

  return { processOutput, testStream, metadata };
};

const createTestMessage = (text: string) => {
  const encoded = new TextEncoder().encode(text);
  return { encoded, text };
};

describe("MultiProcessOutput", () => {
  describe(".bytes()", () => {
    test("with one process", async () => {
      const { processOutput, testStream } = createTestProcess("process 1");

      const messages = [
        createTestMessage("hello 1"),
        createTestMessage("hello 2"),
        createTestMessage("hello 3"),
        createTestMessage("hello 4"),
        createTestMessage("hello 5"),
        createTestMessage("hello 6"),
        createTestMessage("hello 7"),
        createTestMessage("hello 8"),
        createTestMessage("hello 9"),
        createTestMessage("hello 10"),
      ];

      for (const message of messages) {
        testStream.push(message.encoded);
      }
      testStream.close();

      const multiProcessOutput = createMultiProcessOutput([processOutput]);

      let i = 0;
      for await (const chunk of multiProcessOutput.bytes()) {
        expect(chunk).toEqual({
          metadata: { name: "process 1" },
          chunk: messages[i].encoded,
        });
        i++;
      }

      expect(i).toBe(messages.length);
    });

    test("with two processes", async () => {
      const { processOutput: processOutput1, testStream: testStream1 } =
        createTestProcess("process 1");
      const { processOutput: processOutput2, testStream: testStream2 } =
        createTestProcess("process 2");

      const messages1 = [
        createTestMessage("hello 1"),
        createTestMessage("hello 2"),
        createTestMessage("hello 3"),
      ];

      const messages2 = [
        createTestMessage("hello 4"),
        createTestMessage("hello 5"),
        createTestMessage("hello 6"),
      ];

      const multiProcessOutput = createMultiProcessOutput([
        processOutput1,
        processOutput2,
      ]);

      const messageOrder = [
        [1, 0],
        [2, 0],
        [1, 1],
        [2, 1],
        [1, 2],
        [2, 2],
      ];

      for (const [processId, messageIndex] of messageOrder) {
        [testStream1, testStream2][processId - 1].push(
          [messages1, messages2][processId - 1][messageIndex].encoded,
        );
      }

      testStream1.close();
      testStream2.close();

      let i = 0;
      for await (const chunk of multiProcessOutput.bytes()) {
        const [processId, messageIndex] = messageOrder[i];
        expect(chunk).toEqual({
          metadata: { name: `process ${processId}` },
          chunk: [messages1, messages2][processId - 1][messageIndex].encoded,
        });
        i++;
      }
    });
  });

  describe(".text()", () => {
    test("with one process", async () => {
      const { processOutput, testStream } = createTestProcess("process 1");

      const messages = [
        createTestMessage("hello 1"),
        createTestMessage("hello 2"),
        createTestMessage("hello 3"),
      ];

      for (const message of messages) {
        testStream.push(message.encoded);
      }
      testStream.close();

      const multiProcessOutput = createMultiProcessOutput([processOutput]);

      let i = 0;
      for await (const chunk of multiProcessOutput.text()) {
        expect(chunk).toEqual({
          metadata: { name: "process 1" },
          chunk: messages[i].text,
        });
        i++;
      }
      expect(i).toBe(messages.length);
    });

    test("with two processes", async () => {
      const { processOutput: processOutput1, testStream: testStream1 } =
        createTestProcess("process 1");
      const { processOutput: processOutput2, testStream: testStream2 } =
        createTestProcess("process 2");

      const messages1 = [
        createTestMessage("hello 1"),
        createTestMessage("hello 2"),
        createTestMessage("hello 3"),
      ];

      const messages2 = [
        createTestMessage("hello 4"),
        createTestMessage("hello 5"),
        createTestMessage("hello 6"),
      ];

      const multiProcessOutput = createMultiProcessOutput([
        processOutput1,
        processOutput2,
      ]);

      const messageOrder = [
        [1, 0],
        [2, 0],
        [1, 1],
        [2, 1],
        [1, 2],
        [2, 2],
      ];

      for (const [processId, messageIndex] of messageOrder) {
        [testStream1, testStream2][processId - 1].push(
          [messages1, messages2][processId - 1][messageIndex].encoded,
        );
      }

      testStream1.close();
      testStream2.close();

      let i = 0;
      for await (const chunk of multiProcessOutput.text()) {
        const [processId, messageIndex] = messageOrder[i];
        expect(chunk).toEqual({
          metadata: { name: `process ${processId}` },
          chunk: [messages1, messages2][processId - 1][messageIndex].text,
        });
        i++;
      }
    });
  });
});
