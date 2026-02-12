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
  if (
    fs.existsSync(path.join(path.dirname(file), "bun.lock")) ||
    fs.existsSync(path.join(path.dirname(file), ".expect-bun-install-fail"))
  )
    continue;

  let packageJson: object;
  try {
    packageJson = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (_error) {
    continue;
  }

  if (!(packageJson as { workspaces?: string[] })["workspaces"]) {
    continue;
  }

  promises.push(
    (async () => {
      try {
        const exit = await runScript({
          env: {},
          metadata: {},
          scriptCommand: {
            command: "bun install",
            workingDirectory: path.dirname(file),
          },
        }).exit;
        if (!exit.success) {
          console.error(`setupTests: Failed to run bun-install for ${file}`);
        }
      } catch (error) {
        console.error(
          `setupTests: Error installing dependencies for ${file}:`,
          error,
        );
      }
    })(),
  );
}

if (promises.length) {
  await Promise.all(promises);
}
