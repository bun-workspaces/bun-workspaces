---
name: code-quiz
description: Quiz the user on the purpose of code in their repo. Picks a random file (git-tracked by default) and asks the user to explain either the file's overall purpose or that of a randomly-chosen utility inside it. Configure include/exclude globs and the git-tracked toggle via this skill's `config.json`. Invoke when the user asks to be quizzed.
---

# Code Quiz

Version: 0.1.0

## Step 1: pick a file

Run the picker script **with the user's repo root as the current working directory**. Do not `cd` into the skill's directory. The script uses `git rev-parse` and (in the no-git fallback) walks cwd, so an incorrect cwd will either error or silently restrict the quiz to the wrong subtree.

```bash
node <skill-dir>/scripts/pick-file.mjs [scope-dir]
```

The script reads `config.json` from this skill's directory and prints a single file path, relative to the user's repo root, to stdout. If the script exits non-zero, surface its stderr message to the user verbatim and stop.

`[scope-dir]` is optional. Omit it for a fully random pick across the whole repo. Pass a directory path (relative to the user's current working directory, or absolute) when the user asks to be quizzed on a specific area, for example "quiz me on the auth module" → `node <skill-dir>/scripts/pick-file.mjs src/auth`. The scope is applied on top of the configured include/exclude patterns.

## Step 2: form a question

Read the chosen file, then choose a question scope based on the content. The goal is a question with one focused answer — not a sprawling one the user would have to write an essay to fully address.

Use **file-level** ("What is the purpose of `<path>`?") when the file has a single clear responsibility — one main export, one class, a small module of tightly-related helpers, a config or types file, a short script. If asking "what is the purpose of this file" has a crisp answer, ask it.

Use **utility-level** ("What is the purpose of `<symbol>` in `<path>` (line N)?") when the file holds several independent utilities of comparable weight, or is large enough that a file-level answer would have to be vague. Pick one named symbol from the file (function, class, method, type alias, exported constant) and ask about that one, varying your selection to avoid repetition, varying between the
start, middle, or end of files.

Edge cases:

- If the file doesn't seem to contain code, run the picker again instead of quizzing.
- If the file is effectively a single utility (one exported function, everything else is local helpers), file-level and utility-level collapse to the same question — ask file-level.
- If the file is generated, vendored, or otherwise not meaningful to quiz on (e.g. a lockfile that slipped through, a snapshot, a minified bundle), run the picker again instead of quizzing.
- If a utility-level pick would be trivial (e.g. a simple manifest file with no logic, like an index.js with only re-exports), pick a different symbol or fall back to file-level.

Do not summarize the file, hint at the answer, or quote code in your question. Just ask and wait.

## Step 3: evaluate the answer

Once the user responds, judge their answer against the actual code:

- Call out specifically what they got right.
- Call out what they missed or got wrong, with line references.
- If they were entirely correct, say so plainly and move on.

## Notes

- Do not re-use the same file (or, for utility-level questions, the same symbol) as the previous round in this session.
- If the user asks for a hint before answering, give one short hint that does not directly state the purpose.
- If the user asks to skip, run the picker again and ask about the new file.

## User configuration

The skill can be configured via `config.json` in the skill's directory. The following options are available:

- `include`: An array of glob patterns to include in the quiz.
- `exclude`: An array of glob patterns to exclude from the quiz.
- `gitTrackedOnly`: A boolean indicating whether to only quiz on git-tracked files.
