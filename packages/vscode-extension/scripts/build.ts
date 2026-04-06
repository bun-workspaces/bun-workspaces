if (import.meta.main) {
  console.log("[Build] Building extension...");

  const result = await Bun.build({
    entrypoints: ["src/extension.ts"],
    outdir: "dist",
    target: "node",
    format: "cjs",
    external: ["vscode"],
    sourcemap: "inline",
    minify: false,
  });

  if (!result.success) {
    for (const message of result.logs) {
      console.error(message);
    }
    process.exit(1);
  }

  console.log("[Build] Extension built successfully");
}
