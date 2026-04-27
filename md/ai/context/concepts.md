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
- Any pattern can start with `not:` to negate the pattern. (e.g. "not:my-workspace-name", "not:tag:my-tag-\*") This excludes workspaces that match any other present patterns from a result.

### Workspace Script Metadata

Scripts ran via bun-workspaces can access metadata about the workspace, script, and project
via env vars. This same metadata can also be interpolated into inline scripts and appended args.

```typescript
// in a workspace's script invoked by bun-workspaces using a metadata function
import { getWorkspaceScriptMetadata } from "bun-workspaces/script";

// Use the helper within a script that was invoked via bun-workspaces
const projectPath = getWorkspaceScriptMetadata("projectPath");
const projectName = getWorkspaceScriptMetadata("projectName");
const workspaceName = getWorkspaceScriptMetadata("workspaceName");
const workspacePath = getWorkspaceScriptMetadata("workspacePath");
const workspaceRelativePath = getWorkspaceScriptMetadata(
  "workspaceRelativePath"
);
const scriptName = getWorkspaceScriptMetadata("scriptName");
```

```typescript
// In a script, but accessing the same data via plain environment variables (same values as previous example)
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
