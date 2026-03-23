import { Link } from "rspress/theme";

export const WebCliNotes = () => {
  return (
    <div className="web-cli-notes">
      <h6 className="web-cli-notes-title">Notes:</h6>
      <ul>
        <li>
          <code>bw</code> is an alias for <code>bunx bun-workspaces</code>
        </li>
        <li>
          This isn't a full bash shell, so shell operations beyond providing
          args to <code>bw</code> aren't supported.
        </li>
        <li>
          <Link className="inline-link" href="/concepts/inline-scripts">
            Inline scripts
          </Link>
          , the <code>doctor</code> command, and changing the working directory
          via <code>--cwd</code> aren't supported here.
        </li>
      </ul>
    </div>
  );
};
