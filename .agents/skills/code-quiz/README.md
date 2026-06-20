# Code Quiz Skill

Version: 0.1.0

This skill instructs an agent to pop quiz you on the purpose of some piece of code in your repository, using a configurable
script to pick a random code file for an agent to ask you about. This may help you maintain your project knowledge in an easy, bite-sized way that you may even find fun.

Not every project can be developed blindly, and having knowledge of a codebase
can even speed up your development as a peer with an agent, by being able to reference code off the top of your head
rather than relying on the agent continuously scraping the codebase. You may encounter less surprises and have
better ability to catch hallucination, bloat of duplicated logic, and more.

A simple, short pop quiz that you perform regularly can help bolster your code knowledge by forcing you to read and digest
code when something you don't know off the top of your head comes up. This can also serve as a means of performing mini code re-reviews that may help catch code smells.

## Install

Use the [`skills` npm package](https://www.npmjs.com/package/skills) to install this skill in your project:

```bash
npx skills add smorsic/code-quiz-skill
```

Use the **Project** scope for this skill so that the `config.json` file can be applied for your project.

## Use (Claude Example)

Once installed, invoke the skill from inside a project with `/code-quiz`. Claude will pick a random eligible file, ask about its purpose (either the whole file or a specific utility inside it, depending on the content), and grade your answer with line references.

Plain English prompts like "quiz me on my code" also generally work, since Claude routes matching requests to the skill automatically based on its description.

**The quiz can also be scoped to some directory in your repo that you could specify in your prompt.** The configured include/exclude patterns are still applied (see below). For example, you may prompt:

```
/code-quiz only for the frontend package's src
```

You can always ask for a hint or request a different question.

## Configure

There is a `config.json` file at the root of the installed skill that controls which files may be selected. Edit this file to fit each project. The default config includes files tracked by git with a default list of exclusions of commonly irrelevant files.

The three keys:

- **`include`** (`string[]`, default `["**/*"]`): glob patterns of files eligible for the quiz.
- **`exclude`** (`string[]`, default: see file): glob patterns to filter out, applied after include.
- **`gitTrackedOnly`** (`boolean`, default `true`): when true, only git-tracked files are eligible. When false, untracked files are also included (respecting `.gitignore` if inside a git repo).

Pattern syntax follows [git's pathspec `:(glob)` magic](https://git-scm.com/docs/gitglossary#Documentation/gitglossary.txt-aiddefpathspecapathspec): `*` matches any character except `/`, and `**` matches across directories. Brace expansion like `{js,ts,jsx,tsx}` is supported by the picker and expanded before patterns are applied.

## Requirements

- Node (any recent version. The picker uses only Node stdlib, with no install step).
- `git`, when `gitTrackedOnly: true` (the default) or when the picker is run inside a git repo.
