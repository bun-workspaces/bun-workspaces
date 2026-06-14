import { logger } from "./logger";

export const DEPRECATION_NOTICE_STATE = {
  warned: false,
};

export const showDeprecationNotice = () => {
  if (!DEPRECATION_NOTICE_STATE.warned) {
    DEPRECATION_NOTICE_STATE.warned = true;
    logger.warn(
      `
bun-workspaces has been \x1b[1;33mdeprecated\x1b[0;33m and is now developed as \x1b[1;33mpacwich\x1b[0;33m, which supports Bun, npm, and pnpm workspaces, with a mostly backwards compatible CLI and API.

Users can expect little to no disruption beyond the package name change. Config files rename to pacwich.workspace.{ts,js,json,jsonc} and pacwich.project.{ts,js,json,jsonc} (instead of bw.root.{ts,js,json,jsonc}).

A full migration guide including all changes is available: \x1b[4;33mhttps://pacwich.dev/intro/bun-workspaces-migration\x1b[0;33m

Installation documentation: \x1b[4;33mhttps://pacwich.dev/intro/getting-started\x1b[0;33m

For LLM migration assistance, instruct an agent to read \x1b[4;33mhttps://pacwich.dev/intro/bun-workspaces-migration/index.md\x1b[0;33m

bun-workspaces will not receive further releases save for critical security patches if necessary.
`.trim(),
    );
  }
};
