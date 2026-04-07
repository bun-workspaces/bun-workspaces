import type { FromSchema, JSONSchema } from "json-schema-to-ts";
import type { RootConfig } from "./rootConfig";

export const ROOT_CONFIG_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    defaults: {
      type: "object",
      additionalProperties: false,
      properties: {
        parallelMax: {
          type: ["number", "string"],
        },
        shell: {
          type: "string",
        },
        includeRootWorkspace: {
          type: "boolean",
        },
      },
    },
  },
} as const satisfies JSONSchema;

type _ValidateRootConfig<T extends FromSchema<typeof ROOT_CONFIG_JSON_SCHEMA>> =
  T extends FromSchema<typeof ROOT_CONFIG_JSON_SCHEMA> ? T : never;

let _validateSchemaType: _ValidateRootConfig<RootConfig>;
