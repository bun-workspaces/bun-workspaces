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
}
```
