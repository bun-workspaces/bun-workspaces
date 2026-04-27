import type { FileSystemProject } from "../../project/implementations/fileSystemProject";

interface ServerState {
  project: FileSystemProject | null;
}

const SERVER_STATE: ServerState = {
  project: null,
};

export const setServerProject = (project: FileSystemProject | null): void => {
  SERVER_STATE.project = project;
};

export const getServerProject = (): FileSystemProject | null =>
  SERVER_STATE.project;
