import { Link } from "rspress/theme";

export const WebCliNotes = () => {
  return (
    <div className="web-cli-notes">
      <h6 className="web-cli-notes-title">Notes:</h6>
      <ul>
        <li>
          See the full CLI documentation{" "}
          <Link className="inline-link" href="/cli">
            here
          </Link>
          .
        </li>
        <li>
          <code>bw</code> is an alias for <code>bunx bun-workspaces</code>.
          However, you can use <code>bw</code> in your root{" "}
          <code>package.json</code> scripts without setting up a shell alias
          when <code>bun-workspaces</code> is installed.
        </li>
        <li>
          This isn't a full bash shell, so shell operations beyond providing
          args to <code>bw</code> aren't supported.
        </li>
        <li>
          <Link className="inline-link" href="/concepts/inline-scripts">
            Inline scripts
          </Link>
          , the <code>doctor</code> command, appending args to scripts, and
          changing the working directory via <code>--cwd</code> aren't supported
          here.
        </li>
        <li></li>
      </ul>
    </div>
  );
};
