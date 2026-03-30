import path from "path";

if (import.meta.main) {
  console.log("Generating Cursor rules...");

  let content = "";
  for (const contextFile of [
    "md/ai/context/overview.md",
    "md/ai/context/concepts.md",
    "md/ai/context/cliExamples.md",
    "md/ai/context/apiExamples.md",
    "md/ai/context/config.md",
    "md/ai/context/practices.md",
  ]) {
    const contextFilePath = path.resolve(process.cwd(), "../", contextFile);
    console.log(`Reading ${contextFilePath}`);
    content += await Bun.file(contextFilePath).text();
  }
  console.log("All files read");

  const outputPath = path.resolve(process.cwd(), "../.cursor/rules/context.md");

  console.log(`Writing to ${outputPath}`);
  await Bun.write(outputPath, content);
}
