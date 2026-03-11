console.log("workspace-b script");
console.log("argv: ", process.argv.join(" "));
console.log("BW_PROJECT_PATH:", process.env.BW_PROJECT_PATH);
console.log("BW_WORKSPACE_NAME:", process.env.BW_WORKSPACE_NAME);
console.log("BW_WORKSPACE_PATH:", process.env.BW_WORKSPACE_PATH);
console.log(
  "BW_WORKSPACE_RELATIVE_PATH:",
  process.env.BW_WORKSPACE_RELATIVE_PATH,
);
console.log("BW_SCRIPT_NAME:", process.env.BW_SCRIPT_NAME);
