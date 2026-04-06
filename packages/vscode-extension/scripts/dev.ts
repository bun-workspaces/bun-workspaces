import { $ } from "bun";

await $`bun --silent run build`;

await $`bun --silent run init-dev-project`;

// Prefer cursor, fall back to code
const editor =
  process.env.BW_VSC_EDITOR ||
  (await $`which cursor`.quiet().nothrow()).exitCode === 0
    ? "cursor"
    : "code";

await $`${editor} --extensionDevelopmentPath=${import.meta.dir}/.. ${import.meta.dir}/../devProject`;
