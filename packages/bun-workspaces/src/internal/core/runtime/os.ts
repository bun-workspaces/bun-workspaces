export const IS_WINDOWS = process.platform === "win32";
export const IS_MACOS = process.platform === "darwin";
export const IS_LINUX = process.platform === "linux";
export const IS_POSIX = IS_MACOS || IS_LINUX;
