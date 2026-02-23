import type {
  GlobalCommandContext,
  ProjectCommandContext,
} from "./commandHandlerUtils";
import {
  listScripts,
  workspaceInfo,
  scriptInfo,
  listWorkspaces,
  doctor,
} from "./handleSimpleCommands";
import { runScript } from "./runScript";

export const defineGlobalCommands = (context: GlobalCommandContext) => {
  doctor(context);
};

export const defineProjectCommands = (context: ProjectCommandContext) => {
  listWorkspaces(context);
  listScripts(context);
  workspaceInfo(context);
  scriptInfo(context);
  runScript(context);
};
