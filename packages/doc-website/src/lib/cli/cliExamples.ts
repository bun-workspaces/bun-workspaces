import { ENV_VARS_METADATA } from "../config/envVars";

export const CLI_QUICKSTART = `
# You can add this to .bashrc, .zshrc, or similar.
# You can also invoke "bw" in your root package.json scripts.
alias bw="bunx bun-workspaces"

# List all workspaces in your project
bw list-workspaces

# ls is an alias for list-workspaces
bw ls --json --pretty # Output as formatted JSON

# Get info about a workspace
bw workspace-info my-workspace
bw info my-workspace --json --pretty # info is alias for workspace-info

# Get info about a script, such as the workspaces that have it
bw script-info my-script

# Run the lint script for all workspaces
# that have it in their package.json "scripts" field
bw run-script lint

# run is an alias for run-script
bw run lint my-workspace # Run for a single workspace
bw run lint my-workspace-a my-workspace-b # Run for multiple workspaces
bw run lint my-alias-a my-alias-b # Run by alias (set by optional config)

# A workspace's script will wait until any workspaces it depends on have completed
# Similar to Bun's --filter behavior
bw run lint --dep-order

# Continue running scripts even if a dependency fails
bw run lint --dep-order --ignore-dep-failure

bw run lint "my-workspace-*" # Run for matching workspace names
bw run lint "alias:my-alias-pattern-*" "path:my-glob/**/*" # Use matching specifiers

bw run lint --args="--my-appended-args" # Add args to each script call
bw run lint --args="--my-arg=<workspaceName>" # Use the workspace name in args

bw run "bun build" --inline # Run an inline command via the Bun shell

# Scripts run in parallel by default
bw run lint --parallel=false # Run in series
bw run lint --parallel=2 # Run in parallel with a max of 2 concurrent scripts
bw run lint --parallel=auto # Default, based on number of available logical CPUs

# Use the grouped output style (default when on a TTY)
bw run my-script --output-style=grouped

# Set the max preview lines for script output in grouped output style
bw run my-script --output-style=grouped --grouped-lines=all
bw run my-script --output-style=grouped --grouped-lines=10

# Use simple script output with workspace prefixes (default when not on a TTY)
bw run my-script --output-style=prefixed

# Use the plain output style (no workspace prefixes)
bw run my-script --output-style=plain

# Show usage (you can pass --help to any command)
bw help
bw --help

# Show version
bw --version

# Pass --cwd to any command
bw --cwd=/path/to/your/project ls
bw --cwd=/path/to/your/project run my-script

# Pass --log-level to any command (debug, info, warn, error, or silent)
bw --log-level=silent run my-script`.trim();

export const INLINE_SCRIPT_EXAMPLE = `
# Run an inline command from the workspace directory
bw run "bun run build" --inline


`.trim();

export const CLI_PARALLEL_SCRIPTS_EXAMPLE = `
# Scripts run in parallel by default
# This is the same as passing --parallel=default
bw run my-script

# Normally "auto" or the value set by configuration 
# or environment variable (see Default Limit above)
bw run my-script --parallel=default

# Explicitly run in parallel, limiting the max 
# concurrent scripts to the available logical CPUs.
#
# This is the default unless the root ${ENV_VARS_METADATA.parallelMaxDefault.rootConfigDefaultsKey}
# or process.env.${ENV_VARS_METADATA.parallelMaxDefault.envVarName} is set to a different value.
bw run my-script --parallel=auto

# Run in series
bw run my-script --parallel=false

# Run in parallel with a max of the available logical CPUs
bw run my-script --parallel=auto

# Run in parallel with a max of 2 concurrent scripts
bw run my-script --parallel=2

# Run in parallel with a max of 50% of the available logical CPUs
bw run my-script --parallel=50%

# Run every script in parallel (use with caution)
bw run my-script --parallel=unbounded 
`.trim();

export const CLI_INLINE_SHELL_EXAMPLE = `
# This will use the Bun shell, 
# unless the root ${ENV_VARS_METADATA.scriptShellDefault.rootConfigDefaultsKey}
# or process.env.${ENV_VARS_METADATA.scriptShellDefault.envVarName} is set to "system"
bw run "echo 'hello'" --inline

# Same as the above command
bw run "echo 'hello'" --inline --shell=default

# Explicitly run the Bun shell
bw run "echo 'hello'" --inline --shell=bun

# Run an inline command from the workspace directory using the native shell
bw run "echo 'hello'" --inline --shell=system
`.trim();

export const CLI_INLINE_NAME_EXAMPLE = `
# Pass a name for an inline script
bw run "echo 'my script: <scriptName>'" --inline --inline-name=my-inline-script
`.trim();

export const CLI_RUN_SCRIPT_ROOT_SELECTOR_EXAMPLE = `
# Run the lint script from the root package.json
bw run lint @root

# Get workspace information for the root workspace
bw workspace-info @root
`.trim();
