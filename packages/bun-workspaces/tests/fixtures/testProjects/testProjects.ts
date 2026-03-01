import fs from "fs";
import path from "path";
import { IS_WINDOWS } from "../../../src/internal/core";
import { withWindowsPath } from "../../util/windows";

const TEST_PROJECTS = {
  default: "fullProject",
  fullProject: "fullProject",
  notAProject: "notAProject",
  simple1: "simple1",
  simple2: "simple2",
  emptyWorkspaces: "emptyWorkspaces",
  emptyScripts: "emptyScripts",
  oneWorkspace: "oneWorkspace",
  withNodeModuleWorkspace: "withNodeModuleWorkspace",
  negationGlobs: "negationGlobs",
  invalidBadJsonConfig: "invalid/badJsonConfig",
  invalidBadConfigRoot: "invalid/badConfigRoot",
  invalidBadConfigWorkspaceAliases: "invalid/badConfigWorkspaceAliases",
  invalidBadJson: "invalid/badJson",
  invalidNoName: "invalid/noName",
  invalidDuplicateName: "invalid/duplicateName",
  invalidDuplicateAlias: "invalid/duplicateAlias",
  invalidBadTypeWorkspaces: "invalid/badTypeWorkspaces",
  badWorkspaceInvalidName: "invalid/badWorkspaceInvalidName",
  invalidBadTypeScripts: "invalid/badTypeScripts",
  invalidNoPackageJson: "invalid/noPackageJson",
  invalidBadWorkspaceGlobType: "invalid/badWorkspaceGlobType",
  invalidBadWorkspaceGlobOutsideRoot: "invalid/badWorkspaceGlobOutsideRoot",
  invalidAliasConflict: "invalid/aliasConflict",
  invalidAliasNotFound: "invalid/aliasNotFound",
  runScriptWithDelays: "forRunScript/withDelays",
  runScriptWithFailures: "forRunScript/withFailures",
  runScriptWithMixedOutput: "forRunScript/withMixedOutput",
  runScriptWithEchoArgs: "forRunScript/withEchoArgs",
  runScriptWithRuntimeMetadataDebug: "forRunScript/withRuntimeMetadataDebug",
  runScriptWithDelaysAndSequenceConfig:
    "forRunScript/withDelaysAndSequenceConfig",
  runScriptWithDebugParallelMax: "forRunScript/withDebugParallelMax",
  runScriptWithSequenceConfig: "forRunScript/withSequenceConfig",
  runScriptWithSequenceConfigPartial: "forRunScript/withSequenceConfigPartial",
  workspaceConfigPackageOnly: "workspaceConfig/packageOnly",
  workspaceConfigPackageFileMix: "workspaceConfig/packageFileMix",
  workspaceConfigFileOnly: "workspaceConfig/fileOnly",
  workspaceConfigInvalidConfig: "workspaceConfig/invalidConfig",
  workspaceConfigInvalidJson: "workspaceConfig/invalidJson",
  workspaceConfigDeprecatedConfigMix: "workspaceConfig/deprecatedConfigMix",
  rootConfigJsoncFile: "rootConfig/jsoncFile",
  rootConfigPackage: "rootConfig/package",
  rootConfigInvalidJson: "rootConfig/invalidJson",
  rootConfigInvalidType: "rootConfig/invalidType",
  rootConfigInvalidShell: "rootConfig/invalidShell",
  rootConfigInvalidParallel: "rootConfig/invalidParallel",
  rootConfigParallelMaxOnly: "rootConfig/parallelMaxOnly",
  withCatalogSimple: "withCatalog/simple",
  withRootWorkspace: "withRootWorkspace/simple",
  withRootWorkspaceWithConfigFiles: "withRootWorkspace/withConfigFiles",
  withDependenciesSimple: "withDependencies/simple",
  withDependenciesSimpleWithDelays: "withDependencies/simpleWithDelays",
  withDependenciesWithFailures: "withDependencies/withFailures",
  withDependenciesDirectCycle: "withDependencies/withDirectCycle",
  withDependenciesIndirectCycle: "withDependencies/withIndirectCycle",
  withDependenciesIndirectCycleMixed: "withDependencies/withIndirectCycleMixed",
  recursiveScript: "recursiveScript",
};

export type TestProjectName = keyof typeof TEST_PROJECTS;

export const getProjectRoot = (testProjectName: TestProjectName) => {
  const windowsProject = path.join(
    __dirname,
    "_windows",
    TEST_PROJECTS[testProjectName],
  );

  if (IS_WINDOWS && fs.existsSync(windowsProject)) {
    return windowsProject;
  }

  return withWindowsPath(path.join(__dirname, TEST_PROJECTS[testProjectName]));
};
