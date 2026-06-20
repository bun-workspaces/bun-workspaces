import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { expandBraces, globToRegex } from "../scripts/pick-file.mjs";

const SCRIPT = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "scripts",
  "pick-file.mjs",
);

test("expandBraces: no braces returns input unchanged", () => {
  assert.deepEqual(expandBraces("foo.js"), ["foo.js"]);
  assert.deepEqual(expandBraces("src/**/*.ts"), ["src/**/*.ts"]);
});

test("expandBraces: single group", () => {
  assert.deepEqual(expandBraces("*.{a,b,c}"), ["*.a", "*.b", "*.c"]);
});

test("expandBraces: multiple groups produce cartesian product", () => {
  assert.deepEqual(expandBraces("{src,lib}/**/*.{js,ts}").sort(), [
    "lib/**/*.js",
    "lib/**/*.ts",
    "src/**/*.js",
    "src/**/*.ts",
  ]);
});

test("expandBraces: group with multi-char options", () => {
  assert.deepEqual(expandBraces("**/*.{min.js,min.css,map}"), [
    "**/*.min.js",
    "**/*.min.css",
    "**/*.map",
  ]);
});

test("globToRegex: bare * does not cross /", () => {
  const re = globToRegex("*.js");
  assert.ok(re.test("foo.js"));
  assert.ok(!re.test("a/foo.js"));
});

test("globToRegex: ** crosses /", () => {
  const re = globToRegex("**/*.js");
  assert.ok(re.test("foo.js"));
  assert.ok(re.test("a/b/foo.js"));
});

test("globToRegex: literal dots are escaped", () => {
  const re = globToRegex("foo.js");
  assert.ok(re.test("foo.js"));
  assert.ok(!re.test("fooXjs"));
});

test("globToRegex: directory-prefix exclude matches anything under prefix", () => {
  const re = globToRegex("node_modules/**");
  assert.ok(re.test("node_modules/foo"));
  assert.ok(re.test("node_modules/a/b/c"));
  assert.ok(!re.test("src/node_modules/foo"));
});

test("globToRegex: ? matches single non-slash char", () => {
  const re = globToRegex("?.js");
  assert.ok(re.test("a.js"));
  assert.ok(!re.test("ab.js"));
  assert.ok(!re.test("/.js"));
});

const withFixture = (configBody, layout, fn) => {
  const project = mkdtempSync(join(tmpdir(), "code-quiz-proj-"));
  const configDir = mkdtempSync(join(tmpdir(), "code-quiz-conf-"));
  const configPath = join(configDir, "config.json");
  try {
    for (const path of layout) {
      const full = join(project, path);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, "");
    }
    writeFileSync(configPath, JSON.stringify(configBody));
    return fn({ project, configPath });
  } finally {
    rmSync(project, { recursive: true, force: true });
    rmSync(configDir, { recursive: true, force: true });
  }
};

const runPicker = (project, configPath, ...extraArgs) =>
  spawnSync("node", [SCRIPT, ...extraArgs], {
    cwd: project,
    env: { ...process.env, CODE_QUIZ_CONFIG: configPath },
    encoding: "utf8",
  });

test("e2e: no-git fallback picks from include set, honors brace excludes", () => {
  withFixture(
    {
      include: ["**/*"],
      exclude: ["**/*.{png,jpg}"],
      gitTrackedOnly: false,
    },
    ["foo.ts", "bar.js", "image.png", "sub/nested.ts"],
    ({ project, configPath }) => {
      const expected = new Set(["foo.ts", "bar.js", "sub/nested.ts"]);
      const seen = new Set();
      for (let i = 0; i < 30; i++) {
        const res = runPicker(project, configPath);
        assert.equal(res.status, 0, `nonzero exit: ${res.stderr}`);
        const picked = res.stdout.trim();
        assert.ok(
          expected.has(picked),
          `picked ${JSON.stringify(picked)} not in ${[...expected].join(", ")}`,
        );
        seen.add(picked);
      }
      assert.ok(
        seen.size > 1,
        "expected randomness to surface more than one file across 30 picks",
      );
    },
  );
});

test("e2e: errors when gitTrackedOnly:true outside a git repo", () => {
  withFixture(
    { include: ["**/*"], exclude: [], gitTrackedOnly: true },
    ["foo.ts"],
    ({ project, configPath }) => {
      const res = runPicker(project, configPath);
      assert.notEqual(res.status, 0);
      assert.match(res.stderr, /not in a git repository/);
    },
  );
});

test("e2e: scope arg restricts picks to the given subdirectory", () => {
  withFixture(
    { include: ["**/*"], exclude: [], gitTrackedOnly: false },
    ["foo.ts", "sub/bar.ts", "sub/deeper/baz.ts", "other/qux.ts"],
    ({ project, configPath }) => {
      const expected = new Set(["sub/bar.ts", "sub/deeper/baz.ts"]);
      const seen = new Set();
      for (let i = 0; i < 30; i++) {
        const res = runPicker(project, configPath, "sub");
        assert.equal(res.status, 0, `nonzero exit: ${res.stderr}`);
        const picked = res.stdout.trim();
        assert.ok(
          expected.has(picked),
          `picked ${JSON.stringify(picked)} not in scope`,
        );
        seen.add(picked);
      }
      assert.ok(seen.size > 1, "expected both scoped files across 30 picks");
    },
  );
});

test("e2e: scope arg errors when path does not exist", () => {
  withFixture(
    { include: ["**/*"], exclude: [], gitTrackedOnly: false },
    ["foo.ts"],
    ({ project, configPath }) => {
      const res = runPicker(project, configPath, "nonexistent");
      assert.notEqual(res.status, 0);
      assert.match(res.stderr, /does not exist/);
    },
  );
});

test("e2e: scope arg errors when path is a file, not a directory", () => {
  withFixture(
    { include: ["**/*"], exclude: [], gitTrackedOnly: false },
    ["foo.ts"],
    ({ project, configPath }) => {
      const res = runPicker(project, configPath, "foo.ts");
      assert.notEqual(res.status, 0);
      assert.match(res.stderr, /must be a directory/);
    },
  );
});

test("e2e: errors with clear message when no files match", () => {
  withFixture(
    {
      include: ["**/*.never-matches"],
      exclude: [],
      gitTrackedOnly: false,
    },
    ["foo.ts"],
    ({ project, configPath }) => {
      const res = runPicker(project, configPath);
      assert.notEqual(res.status, 0);
      assert.match(res.stderr, /no files matched/);
    },
  );
});
