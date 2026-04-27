import {
  createFileSystemProject,
  type FileSystemProject,
} from "../../project/implementations/fileSystemProject";

interface ServerState {
  workingDirectory: string | null;
}

const SERVER_STATE: ServerState = {
  workingDirectory: null,
};

export const setServerWorkingDirectory = (directory: string | null): void => {
  SERVER_STATE.workingDirectory = directory;
};

export const getServerProject = (): FileSystemProject | null => {
  if (!SERVER_STATE.workingDirectory) return null;
  try {
    return createFileSystemProject({
      rootDirectory: SERVER_STATE.workingDirectory,
    });
  } catch {
    return null;
  }
};
