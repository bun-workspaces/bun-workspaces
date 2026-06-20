#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const version = pkg.version;

const VERSION_LINE_RE = /^Version: .+$/gm;
const NEW_LINE = `Version: ${version}`;

let failed = false;
for (const file of ["README.md", "SKILL.md"]) {
  const path = join(ROOT, file);
  const content = readFileSync(path, "utf8");
  if (!VERSION_LINE_RE.test(content)) {
    console.error(`sync-version: no "Version: ..." line in ${file}`);
    failed = true;
    continue;
  }
  VERSION_LINE_RE.lastIndex = 0;
  const updated = content.replace(VERSION_LINE_RE, NEW_LINE);
  if (updated !== content) {
    writeFileSync(path, updated);
    console.log(`sync-version: ${file} -> ${version}`);
  } else {
    console.log(`sync-version: ${file} already at ${version}`);
  }
}

if (failed) process.exit(1);
