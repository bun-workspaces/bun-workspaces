import fs from "fs";
import os from "os";
import path from "path";
import packageJson from "../../package.json";
import type { Simplify } from "../internal/core";

const getBinaryInfo = () => {
  const argv = process.argv.slice(0);

  let binaryPath: string | null = argv[1] ?? null;
  try {
    binaryPath = path.relative(process.cwd(), fs.realpathSync(binaryPath));
  } catch {
    binaryPath = null;
  }

  return {
    binary: {
      exec: process.execPath,
      path: binaryPath,
    },
  };
};

const getShellInfo = () => ({
  shell: {
    binary: process.env.SHELL ?? null,
    terminal: process.env.TERM ?? null,
  },
});

const getSystemInfo = () => ({
  os: {
    type: os.type(),
    platform: process.platform,
    arch: process.arch,
    release: os.release(),
    version: os.version(),
    cpuCount: os.cpus().length,
  },
});

const getVersionInfo = () => ({
  version: packageJson.version,
  bunVersion: Bun.version_with_sha,
});

export type DoctorInfo = Simplify<
  ReturnType<typeof getVersionInfo> &
    ReturnType<typeof getBinaryInfo> &
    ReturnType<typeof getSystemInfo> &
    ReturnType<typeof getShellInfo>
>;

export const getDoctorInfo = (): DoctorInfo => ({
  ...getVersionInfo(),
  ...getBinaryInfo(),
  ...getSystemInfo(),
  ...getShellInfo(),
});
