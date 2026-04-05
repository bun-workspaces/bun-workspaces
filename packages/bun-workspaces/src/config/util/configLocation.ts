export const CONFIG_LOCATION_TYPES = [
  "tsFile",
  "jsFile",
  "jsoncFile",
  "jsonFile",
  "packageJson",
] as const;

export type ConfigLocationType = (typeof CONFIG_LOCATION_TYPES)[number];

export type ConfigLocation = {
  type: ConfigLocationType;
  content: unknown;
  path: string;
};

const CONFIG_LOCATION_PATHS: Record<
  ConfigLocationType,
  (name: string, packageJsonKey: string) => string
> = {
  tsFile: (name) => `${name}.ts`,
  jsFile: (name) => `${name}.js`,
  jsoncFile: (name) => `${name}.jsonc`,
  jsonFile: (name) => `${name}.json`,
  packageJson: (_, packageJsonKey) => `package.json["${packageJsonKey}"]`,
};

export const createConfigLocationPath = (
  locationType: ConfigLocationType,
  name: string,
  packageJsonKey: string,
) => CONFIG_LOCATION_PATHS[locationType](name, packageJsonKey);
