/* eslint-disable no-console */
import { DEFAULT_TEMP_DIR } from "../../../src/internal/core";

if (import.meta.main) {
  const fileName = `test-${crypto.randomUUID()}.txt`;
  const { filePath } = DEFAULT_TEMP_DIR.createFile({
    name: fileName,
    content: "from createTempFile.ts",
  });
  console.log(filePath);
  if (process.env.CRASH === "true") {
    await Bun.sleep(250);
    throw new Error("Test crash");
  }
  await Bun.sleep(500); // So file can be read before exit cleanup
}
