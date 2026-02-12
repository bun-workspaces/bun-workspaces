import { expect, test, describe } from "bun:test";
import packageJson from "../../package.json";
import { getDoctorInfo } from "../../src/doctor";
import { createRawPattern } from "../../src/internal/core";
import { setupCliTest, assertOutputMatches } from "../util/cliTestUtils";

describe("CLI - doctor command", () => {
  test("shows human-readable output", async () => {
    const { run } = setupCliTest();
    const result = await run("doctor");
    expect(result.stderr.raw).toBeEmpty();
    expect(result.exitCode).toBe(0);
    assertOutputMatches(
      result.stdout.sanitizedCompactLines,
      new RegExp(
        "^" +
          createRawPattern(`bun-workspaces
Version: ${packageJson.version}
Bun Version: ${Bun.version_with_sha}`),
        "m",
      ),
    );
  });

  test("shows JSON output", async () => {
    const { run } = setupCliTest();
    const jsonResult = await run("doctor", "--json");
    expect(jsonResult.stderr.raw).toBeEmpty();
    expect(jsonResult.exitCode).toBe(0);
    const jsonResultObject = JSON.parse(jsonResult.stdout.raw);
    delete jsonResultObject.binary.path;
    const expectedInfo = getDoctorInfo();
    delete (expectedInfo.binary as { path?: string }).path;
    expect(jsonResultObject).toEqual(expectedInfo);
  });

  test("shows pretty JSON output", async () => {
    const { run } = setupCliTest();
    const jsonPrettyResult = await run("doctor", "--json", "--pretty");
    expect(jsonPrettyResult.stderr.raw).toBeEmpty();
    expect(jsonPrettyResult.exitCode).toBe(0);
    const jsonPrettyResultObject = JSON.parse(jsonPrettyResult.stdout.raw);
    delete (jsonPrettyResultObject.binary as { path?: string }).path;
    const expectedInfo = getDoctorInfo();
    delete (expectedInfo.binary as { path?: string }).path;
    expect(jsonPrettyResultObject).toEqual(expectedInfo);
  });

  test("works without a project", async () => {
    const { run } = setupCliTest({ testProject: "notAProject" });
    const result = await run("doctor");
    expect(result.stderr.raw).toBeEmpty();
    expect(result.exitCode).toBe(0);
    assertOutputMatches(
      result.stdout.sanitizedCompactLines,
      new RegExp(
        "^" +
          createRawPattern(`bun-workspaces
Version: ${packageJson.version}
Bun Version: ${Bun.version_with_sha}`),
        "m",
      ),
    );
  });
});
