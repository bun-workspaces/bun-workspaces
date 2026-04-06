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
