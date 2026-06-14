import { FaTimes } from "react-icons/fa";
import { create } from "zustand";

const dismissedStore = create<{
  dismissed: boolean;
  setDismissed: (dismissed: boolean) => void;
}>((set) => ({
  dismissed: false,
  setDismissed: (dismissed: boolean) => set({ dismissed }),
}));

export const DeprecationNotice = () => {
  const { dismissed, setDismissed } = dismissedStore();
  return dismissed ? null : (
    <div className="deprecation-notice">
      <div className="deprecation-notice__header">
        <b>⚠️ Deprecated Package</b>
        <button onClick={() => setDismissed(true)} title="Dismiss">
          <FaTimes />
        </button>
      </div>
      <div className="deprecation-notice__content">
        <p>
          bun-workspaces has been <b>deprecated</b> and{" "}
          <b>
            is now developed as{" "}
            <a target="_blank" href="https://pacwich.dev">
              pacwich
            </a>
          </b>
          , which supports Bun, npm, and pnpm workspaces, with a mostly
          backwards compatible CLI and API. Users can expect little to no
          disruption beyond the package name change and config file name
          changes.{" "}
        </p>
        <p>
          A full migration guide covering all differences between the packages
          is available at{" "}
          <a
            target="_blank"
            href="https://pacwich.dev/intro/bun-workspaces-migration"
          >
            https://pacwich.dev/intro/bun-workspaces-migration
          </a>
        </p>

        <p>
          Installation docs are available at{" "}
          <a target="_blank" href="https://pacwich.dev/intro/getting-started">
            https://pacwich.dev/intro/getting-started
          </a>
        </p>
        <p>
          You can also instruct an LLM agent to read{" "}
          <a
            target="_blank"
            href="https://pacwich.dev/intro/bun-workspaces-migration/index.md"
          >
            https://pacwich.dev/intro/bun-workspaces-migration/index.md
          </a>{" "}
          to assist with migration.
        </p>
        <p>
          <a target="_blank" href="https://smorsic.io/blog/pacwich-launch">
            Read the launch blog post
          </a>{" "}
          about the motivations and development strategy.
        </p>
        <p>
          bun-workspaces will not receive further releases save for critical
          security patches, if necessary. This website will stay up at least
          through 2026. Once decommissioned, documentation will be consolidated
          to the package README.
        </p>
      </div>
    </div>
  );
};
