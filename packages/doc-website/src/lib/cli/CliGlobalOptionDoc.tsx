import { type CliGlobalOptionName } from "bun-workspaces/cli";
import { useId } from "react";
import { SyntaxHighlighter } from "../util/highlight";
import { getCliGlobalOptionContent } from "./cliGlobalOptions";
import { getGlobalOptionId } from "./searchIds";

export const CliGlobalOptionDoc = ({
  option,
  deprecationText,
}: {
  option: CliGlobalOptionName;
  deprecationText?: React.ReactNode;
}) => {
  const content = getCliGlobalOptionContent(option);
  const id = useId();
  return (
    <div className="cli-global-option-doc">
      <div id={getGlobalOptionId(content)} className="cli-doc-section-anchor" />
      {deprecationText ? (
        <div className="cli-global-option-doc-deprecation-text">
          DEPRECATED: {deprecationText}
        </div>
      ) : null}
      <p>
        Usage: <code>{content.mainOption}</code> |{" "}
        <code>{content.shortOption}</code>{" "}
      </p>
      {content.values?.length ? (
        <p>
          Values:{" "}
          {content.values.map((value, i) => (
            <code
              key={id + "code-value-" + i}
              style={{ marginRight: "0.25rem" }}
            >
              {value}
            </code>
          ))}
        </p>
      ) : (
        ""
      )}
      {content.defaultValue ? (
        <p>
          Default Value: <code>{content.defaultValue}</code>
        </p>
      ) : (
        ""
      )}
      <p>{content.description}</p>
      <h5>
        <em>Examples:</em>
      </h5>
      <SyntaxHighlighter language="bash">
        {content.examples.join("\n")}
      </SyntaxHighlighter>
    </div>
  );
};
