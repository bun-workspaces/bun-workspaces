import type { ComponentProps } from "react";

export const RequiredBunVersion = (props: ComponentProps<"p">) => (
  <p {...props}>Required Bun version: {process.env.REQUIRED_BUN_VERSION}</p>
);
