import { USER_ENV_VARS, type UserEnvVarName } from "bw-common/config";

export const getUserEnvVar = (key: UserEnvVarName) =>
  process.env[USER_ENV_VARS[key]];
