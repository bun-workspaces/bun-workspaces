import fs from "fs";
import path from "path";
import Ajv from "ajv";
import standaloneCode from "ajv/dist/standalone";
import { createScriptLogger } from "bw-meta/util";
import { ROOT_CONFIG_JSON_SCHEMA } from "../src/config/rootConfig/rootConfigSchema";
import { WORKSPACE_CONFIG_JSON_SCHEMA } from "../src/config/workspaceConfig/workspaceConfigSchema";

const logger = createScriptLogger({ name: "bw:AJV" });

if (import.meta.main) {
  logger.info("Compiling AJV scripts...");

  const ajv = new Ajv({
    code: { source: true, esm: true },
    allowUnionTypes: true,
  });

  const validateWorkspaceConfig = ajv.compile(WORKSPACE_CONFIG_JSON_SCHEMA);
  const validateRootConfig = ajv.compile(ROOT_CONFIG_JSON_SCHEMA);

  const workspaceFilePath = path.join(
    __dirname,
    "../src/internal/generated/ajv/validateWorkspaceConfig.js",
  );

  logger.debug(`workspaceFilePath: ${workspaceFilePath}`);

  const rootFilePath = path.join(
    __dirname,
    "../src/internal/generated/ajv/validateRootConfig.js",
  );

  logger.debug(`rootFilePath: ${rootFilePath}`);

  logger.info(
    `Writing ${path.relative(path.join(process.cwd(), "../../"), workspaceFilePath)}`,
  );
  fs.writeFileSync(
    workspaceFilePath,
    standaloneCode(ajv, validateWorkspaceConfig),
  );

  logger.info(
    `Writing ${path.relative(path.join(process.cwd(), "../../"), rootFilePath)}`,
  );
  fs.writeFileSync(rootFilePath, standaloneCode(ajv, validateRootConfig));

  logger.info("Finished AJV generation");
}
