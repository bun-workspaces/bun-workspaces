## Root config

Optional project config can be placed in `bw.root.jsonc`/`bw.root.json` in the root directory.

Config defaults here take precedence over environment variables that can set defaults.
Explicit arguments to the CLI or API take precedence over all other settings.

```jsonc
{
  "defaults": {
    "parallelMax": 5, // same options as seen in CLI examples above
    "shell": "system", // "bun" or "system" (default "bun")
    "includeRootWorkspace": true, // treat root package.json as a normal workspace
  },
}
```

## Workspace config

Optional config can be placed in `bw.workspace.jsonc`/`bw.workspace.json` in a workspace directory.

Aliases must be unique to each workspace and to not clash with other workspaces' `package.json` names.

Tags are strings to group workspaces together that therefore don't need to be unique to each workspace.

```jsonc
{
  "alias": "my-alias", // can be array
  "tags": ["my-tag"],
  "scripts": {
    "lint": {
      // set optional sorting order for scripts
      "order": 1,
    },
  },
  "rules": {
    "workspaceDependencies": {
      // allowPatterns: only workspaces matching these patterns are permitted as dependencies
      "allowPatterns": ["my-allow-pattern-*"],
      // denyPatterns: workspaces matching these patterns are forbidden as dependencies
      // when combined with allowPatterns, deny filters within the allowed subset
      "denyPatterns": ["my-deny-pattern-*"],
    },
  },
}
```

### Workspace Dependency Rules

Using the `rules.workspaceDependencies` field, you can define rules for which workspaces are allowed to be dependencies,
using `allowPatterns`, `denyPatterns`, or both.

`allowPatterns` defines the permitted subset of dependencies. `denyPatterns` forbids specific dependencies.
When both are present, `denyPatterns` further filters within the subset permitted by `allowPatterns`.

Workspace Patterns are used to match workspaces.

## TypeScript/JSON Config Files

You can use TypeScript/JSON config files to define your workspace configuration.

### TypeScript

`bw.workspace.ts`

```ts
import { defineWorkspaceConfig } from "bun-workspaces/config";

export default defineWorkspaceConfig({
  alias: "my-alias",
  tags: ["my-tag"],
});
```

`bw.root.ts`

```ts
import { defineRootConfig } from "bun-workspaces/config";

export default defineRootConfig({
  defaults: {
    parallelMax: 5,
  },
});
```
