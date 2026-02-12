/* eslint-disable no-console */
import fs from "fs";
import path from "path";
import { Glob } from "bun";
import { setLogLevel } from "./src";
import { runScript } from "./src/runScript";

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
        await runScript({
          env: {},
          metadata: {},
          scriptCommand: {
            command: "bun install",
            workingDirectory: path.dirname(file),
          },
        }).exit;
      } catch (error) {
        console.error(`Error installing dependencies for ${file}:`, error);
      }
    })(),
  );
}

if (promises.length) {
  await Promise.all(promises);
}
