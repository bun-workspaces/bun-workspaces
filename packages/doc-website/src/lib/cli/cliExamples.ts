import { ENV_VARS_METADATA } from "../config/envVars";
export { CLI_QUICKSTART } from "./cliQuickstart";

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
