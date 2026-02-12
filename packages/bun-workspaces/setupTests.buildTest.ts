import fs from "fs";
import path from "path";
import { Glob } from "bun";
// @ts-expect-error - Importing from mjs file in build for build:test script
import { setLogLevel } from "./src/index.mjs";
// @ts-expect-error - Importing from mjs file in build for build:test script
import { runScript } from "./src/runScript/index.mjs";

setLogLevel("silent");

const testProjectsDir = path.join(
  __dirname,
  "tests",
  "fixtures",
  "testProjects",
);

const promises: Promise<unknown>[] = [];

for (const file of new Glob("**/*/package.json").scanSync({
  cwd: testProjectsDir,
  absolute: true,
})) {
  if (fs.existsSync(path.join(path.dirname(file), "bun.lock"))) continue;
  promises.push(
    (async () => {
      try {
        const result = await runScript({
          env: {},
          metadata: {},
          scriptCommand: {
            command: "bun install",
            workingDirectory: path.dirname(file),
          },
          shell: "bun",
        }).exit;
        if (result.exitCode !== 0) {
          throw new Error(`Failed to install dependencies for ${file}`);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Error installing dependencies for ${file}:`, error);
      }
    })(),
  );
}

if (promises.length) {
  await Promise.all(promises);
}
