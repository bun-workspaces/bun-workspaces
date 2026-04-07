## Concepts

### Workspace patterns

Many features accept a list of workspace patterns to match a subset of workspaces.

By default, a pattern matches the workspace name or alias: `my-workspace-name` or `my-alias-name`. Aliases are defined in config explained below.

Patterns can include a wildcard to match only by workspace name: `my-workspace-*`.

- Alias pattern specifier: `alias:my-alias-*`.
- Path pattern specifier (supports glob): `path:packages/**/*`.
- Name pattern specifier: `name:my-workspace-*`.
- Tag pattern specifier: `tag:my-tag`.
- Special root workspace selector: `@root`.

### Script runtime metadata

Scripts ran via bw can access metadata via env vars. This same metadata can be interpolated into inline scripts and appended args.

```typescript
// in a script
const projectPath = process.env.BW_PROJECT_PATH;
const workspaceName = process.env.BW_WORKSPACE_NAME;
const workspacePath = process.env.BW_WORKSPACE_PATH;
const workspaceRelativePath = process.env.BW_WORKSPACE_RELATIVE_PATH;
const scriptName = process.env.BW_SCRIPT_NAME;
```

```bash
# interpolated
bw run "bun <projectPath>/my-script.ts" --inline \
  --inline-name="my-script-name" \
  --args="<workspaceName> <workspacePath>"
```
