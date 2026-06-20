#!/usr/bin/env node
import { readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { join, dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

export const expandBraces = (pattern) => {
  const m = pattern.match(/\{([^{}]+)\}/);
  if (!m) return [pattern];
  const before = pattern.slice(0, m.index);
  const after = pattern.slice(m.index + m[0].length);
  return m[1].split(",").flatMap((opt) => expandBraces(before + opt + after));
};

export const globToRegex = (glob) => {
  let re = "^";
  let i = 0;
  while (i < glob.length) {
    const c = glob[i];
    if (c === "*" && glob[i + 1] === "*") {
      if (glob[i + 2] === "/") {
        re += "(?:.*/)?";
        i += 3;
      } else {
        re += ".*";
        i += 2;
      }
    } else if (c === "*") {
      re += "[^/]*";
      i += 1;
    } else if (c === "?") {
      re += "[^/]";
      i += 1;
    } else if (".+^$(){}|[]\\".includes(c)) {
      re += "\\" + c;
      i += 1;
    } else {
      re += c;
      i += 1;
    }
  }
  return new RegExp(re + "$");
};

const main = () => {
  const die = (msg) => {
    console.error(`code-quiz: ${msg}`);
    process.exit(1);
  };

  const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
  const SKILL_DIR = dirname(SCRIPT_DIR);
  const CONFIG_PATH =
    process.env.CODE_QUIZ_CONFIG ?? join(SKILL_DIR, "config.json");

  let config;
  try {
    config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
  } catch (err) {
    die(`failed to read config at ${CONFIG_PATH}: ${err.message}`);
  }

  const rawIncludes =
    Array.isArray(config.include) && config.include.length > 0
      ? config.include
      : ["**/*"];
  const rawExcludes = Array.isArray(config.exclude) ? config.exclude : [];
  const includes = rawIncludes.flatMap(expandBraces);
  const excludes = rawExcludes.flatMap(expandBraces);
  const gitTrackedOnly = config.gitTrackedOnly ?? true;

  const scopeArg = process.argv[2];
  let scopeAbs = null;
  if (scopeArg) {
    scopeAbs = resolve(process.cwd(), scopeArg);
    let stat;
    try {
      stat = statSync(scopeAbs);
    } catch {
      die(`scope path does not exist: ${scopeArg}`);
    }
    if (!stat.isDirectory()) die(`scope must be a directory: ${scopeArg}`);
  }

  const git = (args, opts = {}) =>
    spawnSync("git", args, { encoding: "utf8", ...opts });

  const inGitRepo = git(["rev-parse", "--is-inside-work-tree"]).status === 0;

  const lsFiles = (baseArgs) => {
    const top = git(["rev-parse", "--show-toplevel"]).stdout.trim();
    const pathspecs = includes.map((p) => `:(glob,top)${p}`);
    const res = git([...baseArgs, "--", ...pathspecs], { cwd: top });
    if (res.status !== 0) die(`git ls-files failed: ${res.stderr.trim()}`);
    const excRes = excludes.map(globToRegex);
    let out = res.stdout
      .split("\0")
      .filter(Boolean)
      .filter((f) => !excRes.some((re) => re.test(f)));
    if (scopeAbs) {
      const scopeRel = relative(top, scopeAbs).split(sep).join("/");
      if (scopeRel.startsWith("..")) {
        die(`scope is outside the git repository: ${scopeArg}`);
      }
      if (scopeRel) {
        out = out.filter((f) => f === scopeRel || f.startsWith(scopeRel + "/"));
      }
    }
    return out;
  };

  const walkAndFilter = () => {
    const cwd = process.cwd();
    const walkRoot = scopeAbs ?? cwd;
    const all = [];
    const walk = (dir) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          if (entry.name === ".git") continue;
          walk(join(dir, entry.name));
        } else if (entry.isFile()) {
          all.push(relative(cwd, join(dir, entry.name)).split(sep).join("/"));
        }
      }
    };
    walk(walkRoot);

    const incRes = includes.map(globToRegex);
    const excRes = excludes.map(globToRegex);
    return all.filter(
      (f) =>
        incRes.some((re) => re.test(f)) && !excRes.some((re) => re.test(f)),
    );
  };

  let files;
  if (gitTrackedOnly) {
    if (!inGitRepo) die("not in a git repository (gitTrackedOnly is true)");
    files = lsFiles(["ls-files", "-z"]);
  } else if (inGitRepo) {
    files = lsFiles([
      "ls-files",
      "-z",
      "--cached",
      "--others",
      "--exclude-standard",
    ]);
  } else {
    files = walkAndFilter();
  }

  if (files.length === 0) die("no files matched include/exclude patterns");

  console.log(files[Math.floor(Math.random() * files.length)]);
};

if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
