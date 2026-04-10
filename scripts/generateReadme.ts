import path from "path";

import {
  CLI_QUICKSTART,
  API_QUICKSTART,
} from "bun-workspaces/src/internal/docs";

if (import.meta.main) {
  console.log("Generating README...");

  const readmeTemplatePath = path.resolve(
    process.cwd(),
    "../md/public/README_TEMPLATE.md",
  );

  console.log(`Reading ${readmeTemplatePath}`);
  const readmeTemplate = await Bun.file(readmeTemplatePath).text();

  const content = readmeTemplate
    .replace(/<<CLI_QUICKSTART>>/gm, CLI_QUICKSTART)
    .replace(/<<API_QUICKSTART>>/gm, API_QUICKSTART);

  const readmePath = path.resolve(process.cwd(), "../README.md");

  console.log(`Writing to ${readmePath}`);
  await Bun.write(readmePath, content);

  console.log("README generated successfully");
}
