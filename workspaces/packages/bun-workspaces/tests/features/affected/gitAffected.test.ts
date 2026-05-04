import { afterEach, describe, expect, test } from "bun:test";
import {
  GIT_AFFECTED_ERRORS,
  getGitAffectedFiles,
} from "../../../src/workspaces/affected/gitAffected";
import { createGitFixture, type GitFixture } from "../../util/gitFixtures";

const fixtures: GitFixture[] = [];

const newFixture = async (
  ...args: Parameters<typeof createGitFixture>
): Promise<GitFixture> => {
  const fixture = await createGitFixture(...args);
  fixtures.push(fixture);
  return fixture;
};

afterEach(() => {
  while (fixtures.length) {
    fixtures.pop()!.cleanup();
  }
});

describe("getGitAffectedFiles", () => {
  describe("committed range", () => {
    test("returns files changed between base and head", async () => {
      const fixture = await newFixture({
        commits: [
          {
            message: "init",
            files: [
              { path: "a.txt", content: "1" },
              { path: "b.txt", content: "1" },
            ],
          },
          {
            message: "change",
            files: [{ path: "a.txt", content: "2" }],
          },
        ],
      });

      const { files } = await getGitAffectedFiles({
        rootDirectory: fixture.projectPath,
        baseRef: fixture.shaForMessage("init"),
        headRef: fixture.shaForMessage("change"),
        ignoreUncommitted: true,
      });

      expect(files).toEqual([{ projectFilePath: "a.txt", reasons: ["diff"] }]);
    });

    test("identical refs produce no diff entries", async () => {
      const fixture = await newFixture({
        commits: [
          {
            message: "init",
            files: [{ path: "a.txt", content: "1" }],
          },
        ],
      });

      const { files } = await getGitAffectedFiles({
        rootDirectory: fixture.projectPath,
        baseRef: fixture.headSha,
        headRef: fixture.headSha,
        ignoreUncommitted: true,
      });

      expect(files).toEqual([]);
    });

    test("includes deleted files", async () => {
      const fixture = await newFixture({
        commits: [
          {
            message: "init",
            files: [
              { path: "a.txt", content: "1" },
              { path: "b.txt", content: "1" },
            ],
          },
          {
            message: "delete",
            remove: ["b.txt"],
          },
        ],
      });

      const { files } = await getGitAffectedFiles({
        rootDirectory: fixture.projectPath,
        baseRef: fixture.shaForMessage("init"),
        headRef: fixture.shaForMessage("delete"),
        ignoreUncommitted: true,
      });

      expect(files.map((f) => f.projectFilePath)).toEqual(["b.txt"]);
    });

    test("accepts branch refs as base and head", async () => {
      const fixture = await newFixture({
        commits: [
          {
            message: "init",
            files: [{ path: "a.txt", content: "1" }],
          },
        ],
        initialBranch: "main",
      });
      await fixture.runGit(["checkout", "-b", "feature"]);
      const { writeFileSync } = await import("fs");
      const path = await import("path");
      writeFileSync(path.join(fixture.repoPath, "a.txt"), "2");
      await fixture.runGit(["add", "-A"]);
      await fixture.runGit(["commit", "-m", "feature change"]);

      const { files } = await getGitAffectedFiles({
        rootDirectory: fixture.projectPath,
        baseRef: "main",
        headRef: "feature",
        ignoreUncommitted: true,
      });

      expect(files).toEqual([{ projectFilePath: "a.txt", reasons: ["diff"] }]);
    });

    test("invalid base ref throws GitCommandFailed", async () => {
      const fixture = await newFixture({
        commits: [
          { message: "init", files: [{ path: "a.txt", content: "1" }] },
        ],
      });

      await expect(
        getGitAffectedFiles({
          rootDirectory: fixture.projectPath,
          baseRef: "no-such-ref",
          headRef: fixture.headSha,
          ignoreUncommitted: true,
        }),
      ).rejects.toBeInstanceOf(GIT_AFFECTED_ERRORS.GitCommandFailed);
    });
  });

  describe("working tree state", () => {
    test("includes staged, unstaged, and untracked files", async () => {
      const fixture = await newFixture({
        commits: [
          {
            message: "init",
            files: [
              { path: "tracked-staged.txt", content: "1" },
              { path: "tracked-unstaged.txt", content: "1" },
            ],
          },
        ],
        workingState: {
          stage: [{ path: "tracked-staged.txt", content: "2" }],
          modify: [{ path: "tracked-unstaged.txt", content: "2" }],
        },
      });

      // Add an untracked file after the fixture is built
      const { writeFileSync } = await import("fs");
      const path = await import("path");
      writeFileSync(path.join(fixture.repoPath, "new-untracked.txt"), "new");

      const { files } = await getGitAffectedFiles({
        rootDirectory: fixture.projectPath,
        baseRef: fixture.headSha,
        headRef: fixture.headSha,
      });

      expect(files).toEqual([
        { projectFilePath: "new-untracked.txt", reasons: ["untracked"] },
        { projectFilePath: "tracked-staged.txt", reasons: ["staged"] },
        { projectFilePath: "tracked-unstaged.txt", reasons: ["unstaged"] },
      ]);
    });

    test("partially staged file reports both staged and unstaged", async () => {
      const fixture = await newFixture({
        commits: [
          {
            message: "init",
            files: [{ path: "a.txt", content: "1" }],
          },
        ],
        workingState: {
          partiallyStage: [{ path: "a.txt", staged: "2", working: "3" }],
        },
      });

      const { files } = await getGitAffectedFiles({
        rootDirectory: fixture.projectPath,
        baseRef: fixture.headSha,
        headRef: fixture.headSha,
      });

      expect(files).toEqual([
        { projectFilePath: "a.txt", reasons: ["staged", "unstaged"] },
      ]);
    });

    test("a file in the diff range and modified locally reports both reasons", async () => {
      const fixture = await newFixture({
        commits: [
          {
            message: "init",
            files: [{ path: "a.txt", content: "1" }],
          },
          {
            message: "change",
            files: [{ path: "a.txt", content: "2" }],
          },
        ],
        workingState: {
          modify: [{ path: "a.txt", content: "3" }],
        },
      });

      const { files } = await getGitAffectedFiles({
        rootDirectory: fixture.projectPath,
        baseRef: fixture.shaForMessage("init"),
        headRef: fixture.shaForMessage("change"),
      });

      expect(files).toEqual([
        { projectFilePath: "a.txt", reasons: ["diff", "unstaged"] },
      ]);
    });

    test("untracked respects gitignore", async () => {
      const fixture = await newFixture({
        commits: [
          {
            message: "init",
            files: [
              { path: ".gitignore", content: "ignored.txt\n" },
              { path: "tracked.txt", content: "1" },
            ],
          },
        ],
      });

      const { writeFileSync } = await import("fs");
      const path = await import("path");
      writeFileSync(path.join(fixture.repoPath, "ignored.txt"), "x");
      writeFileSync(path.join(fixture.repoPath, "visible.txt"), "x");

      const { files } = await getGitAffectedFiles({
        rootDirectory: fixture.projectPath,
        baseRef: fixture.headSha,
        headRef: fixture.headSha,
      });

      expect(files.map((f) => f.projectFilePath)).toEqual(["visible.txt"]);
    });
  });

  describe("ignore flags", () => {
    test("ignoreUntracked excludes untracked files only", async () => {
      const fixture = await newFixture({
        commits: [
          { message: "init", files: [{ path: "a.txt", content: "1" }] },
        ],
        workingState: {
          stage: [{ path: "staged.txt", content: "s" }],
          modify: [{ path: "a.txt", content: "2" }],
        },
      });

      const { writeFileSync } = await import("fs");
      const path = await import("path");
      writeFileSync(path.join(fixture.repoPath, "untracked.txt"), "u");

      const { files } = await getGitAffectedFiles({
        rootDirectory: fixture.projectPath,
        baseRef: fixture.headSha,
        headRef: fixture.headSha,
        ignoreUntracked: true,
      });

      expect(files.map((f) => f.projectFilePath).sort()).toEqual([
        "a.txt",
        "staged.txt",
      ]);
    });

    test("ignoreStaged excludes staged files only", async () => {
      const fixture = await newFixture({
        commits: [
          { message: "init", files: [{ path: "a.txt", content: "1" }] },
        ],
        workingState: {
          stage: [{ path: "staged.txt", content: "s" }],
          modify: [{ path: "a.txt", content: "2" }],
        },
      });

      const { files } = await getGitAffectedFiles({
        rootDirectory: fixture.projectPath,
        baseRef: fixture.headSha,
        headRef: fixture.headSha,
        ignoreStaged: true,
      });

      expect(files.map((f) => f.projectFilePath)).toEqual(["a.txt"]);
    });

    test("ignoreUnstaged excludes unstaged files only", async () => {
      const fixture = await newFixture({
        commits: [
          { message: "init", files: [{ path: "a.txt", content: "1" }] },
        ],
        workingState: {
          stage: [{ path: "staged.txt", content: "s" }],
          modify: [{ path: "a.txt", content: "2" }],
        },
      });

      const { files } = await getGitAffectedFiles({
        rootDirectory: fixture.projectPath,
        baseRef: fixture.headSha,
        headRef: fixture.headSha,
        ignoreUnstaged: true,
      });

      expect(files.map((f) => f.projectFilePath)).toEqual(["staged.txt"]);
    });

    test("ignoreStaged + ignoreUntracked leaves diff and unstaged", async () => {
      const fixture = await newFixture({
        commits: [
          { message: "init", files: [{ path: "a.txt", content: "1" }] },
          { message: "change", files: [{ path: "a.txt", content: "2" }] },
        ],
        workingState: {
          stage: [{ path: "staged.txt", content: "s" }],
          modify: [{ path: "tracked-modified.txt", content: "m" }],
        },
      });
      // Add an unstaged change to a previously committed file
      const { writeFileSync } = await import("fs");
      const path = await import("path");
      writeFileSync(path.join(fixture.repoPath, "tracked-modified.txt"), "m");
      // Pre-commit it so it has history, then modify
      await fixture.runGit(["add", "tracked-modified.txt"]);
      await fixture.runGit(["commit", "-m", "track tracked-modified"]);
      writeFileSync(path.join(fixture.repoPath, "tracked-modified.txt"), "m2");
      // Add an untracked file we expect to be ignored
      writeFileSync(path.join(fixture.repoPath, "untracked.txt"), "u");

      const { files } = await getGitAffectedFiles({
        rootDirectory: fixture.projectPath,
        baseRef: fixture.shaForMessage("init"),
        headRef: fixture.shaForMessage("change"),
        ignoreStaged: true,
        ignoreUntracked: true,
      });

      expect(files).toEqual([
        { projectFilePath: "a.txt", reasons: ["diff"] },
        { projectFilePath: "tracked-modified.txt", reasons: ["unstaged"] },
      ]);
    });

    test("ignoreStaged + ignoreUnstaged leaves diff and untracked", async () => {
      const fixture = await newFixture({
        commits: [
          { message: "init", files: [{ path: "a.txt", content: "1" }] },
          { message: "change", files: [{ path: "a.txt", content: "2" }] },
        ],
        workingState: {
          stage: [{ path: "staged.txt", content: "s" }],
          modify: [{ path: "a.txt", content: "3" }],
        },
      });
      const { writeFileSync } = await import("fs");
      const path = await import("path");
      writeFileSync(path.join(fixture.repoPath, "untracked.txt"), "u");

      const { files } = await getGitAffectedFiles({
        rootDirectory: fixture.projectPath,
        baseRef: fixture.shaForMessage("init"),
        headRef: fixture.shaForMessage("change"),
        ignoreStaged: true,
        ignoreUnstaged: true,
      });

      expect(files).toEqual([
        { projectFilePath: "a.txt", reasons: ["diff"] },
        { projectFilePath: "untracked.txt", reasons: ["untracked"] },
      ]);
    });

    test("ignoreUncommitted overrides individual ignore flags", async () => {
      const fixture = await newFixture({
        commits: [
          { message: "init", files: [{ path: "a.txt", content: "1" }] },
          { message: "change", files: [{ path: "a.txt", content: "2" }] },
        ],
        workingState: {
          stage: [{ path: "staged.txt", content: "s" }],
          modify: [{ path: "a.txt", content: "3" }],
        },
      });

      const { files } = await getGitAffectedFiles({
        rootDirectory: fixture.projectPath,
        baseRef: fixture.shaForMessage("init"),
        headRef: fixture.shaForMessage("change"),
        ignoreUncommitted: true,
        // These would otherwise let staged through, but ignoreUncommitted wins
        ignoreUnstaged: false,
        ignoreUntracked: false,
      });

      expect(files).toEqual([{ projectFilePath: "a.txt", reasons: ["diff"] }]);
    });

    test("ignoreUncommitted excludes all working-tree state", async () => {
      const fixture = await newFixture({
        commits: [
          { message: "init", files: [{ path: "a.txt", content: "1" }] },
          { message: "change", files: [{ path: "a.txt", content: "2" }] },
        ],
        workingState: {
          stage: [{ path: "staged.txt", content: "s" }],
          modify: [{ path: "a.txt", content: "3" }],
        },
      });

      const { writeFileSync } = await import("fs");
      const path = await import("path");
      writeFileSync(path.join(fixture.repoPath, "untracked.txt"), "u");

      const { files } = await getGitAffectedFiles({
        rootDirectory: fixture.projectPath,
        baseRef: fixture.shaForMessage("init"),
        headRef: fixture.shaForMessage("change"),
        ignoreUncommitted: true,
      });

      expect(files).toEqual([{ projectFilePath: "a.txt", reasons: ["diff"] }]);
    });
  });

  describe("project root resolution", () => {
    test("filters files outside the project root when project is a subdir", async () => {
      const fixture = await newFixture({
        commits: [
          {
            message: "init",
            files: [
              { path: "outside.txt", content: "1" },
              { path: "app/inside.txt", content: "1" },
            ],
          },
          {
            message: "change",
            files: [
              { path: "outside.txt", content: "2" },
              { path: "app/inside.txt", content: "2" },
            ],
          },
        ],
        projectSubdir: "app",
      });

      const { files } = await getGitAffectedFiles({
        rootDirectory: fixture.projectPath,
        baseRef: fixture.shaForMessage("init"),
        headRef: fixture.shaForMessage("change"),
        ignoreUncommitted: true,
      });

      expect(files).toEqual([
        { projectFilePath: "inside.txt", reasons: ["diff"] },
      ]);
    });

    test("works when project root is the git root", async () => {
      const fixture = await newFixture({
        commits: [
          { message: "init", files: [{ path: "a.txt", content: "1" }] },
          { message: "change", files: [{ path: "a.txt", content: "2" }] },
        ],
      });

      const { files } = await getGitAffectedFiles({
        rootDirectory: fixture.projectPath,
        baseRef: fixture.shaForMessage("init"),
        headRef: fixture.shaForMessage("change"),
        ignoreUncommitted: true,
      });

      expect(files).toEqual([{ projectFilePath: "a.txt", reasons: ["diff"] }]);
    });

    test("throws NoGitRepository when run outside a git repo", async () => {
      const { mkdtempSync, rmSync } = await import("fs");
      const path = await import("path");
      const os = await import("os");
      const dir = mkdtempSync(path.join(os.tmpdir(), "bw-not-git-"));
      try {
        await expect(
          getGitAffectedFiles({
            rootDirectory: dir,
            baseRef: "HEAD",
            headRef: "HEAD",
          }),
        ).rejects.toBeInstanceOf(GIT_AFFECTED_ERRORS.NoGitRepository);
      } finally {
        rmSync(dir, { force: true, recursive: true });
      }
    });
  });
});
