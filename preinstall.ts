import { $ } from "bun";

// Run pnpm install simply to update pnpm-lock.yaml for Dependabot which fails to read Bun deps.
// TODO: Remove this and pnpm meta files when Dependabot supports Bun (it may likely be broken for catalogs)
if (process.env.CI !== "true") {
  await $`mv node_modules node_modules.ignore-me.backup`.nothrow();
  await $`pnpm install --ignore-scripts`;
  await Bun.sleep(1000);
  await $`mv node_modules.ignore-me.backup node_modules`.nothrow();
}
