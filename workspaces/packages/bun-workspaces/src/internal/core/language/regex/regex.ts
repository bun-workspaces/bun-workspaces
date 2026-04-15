export const createRawPattern = (pattern: string) =>
  pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const createWildcardRegex = (pattern: string) =>
  new RegExp(`^${pattern.split("*").map(createRawPattern).join(".*")}$`);

export const sanitizeAnsi = (text: string) =>
  // eslint-disable-next-line no-control-regex
  text.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "");
