#!/bin/sh
":" //# ; case "$npm_lifecycle_event:$0" in bunx:*|*:*/.bun/*) exec bun "$0" "$@" ;; *) command -v node >/dev/null 2>&1 && exec node "$0" "$@" || exec bun "$0" "$@" ;; esac
// On POSIX: Runs via bun when ran via bunx or when installed globally via bun. Otherwise runs via node.
import { delegateToLocalPacwichIfPresent } from "../src/cli/localDelegation.js";
delegateToLocalPacwichIfPresent();
const { createCli } = await import("../src/cli/index.js");
createCli().run();
