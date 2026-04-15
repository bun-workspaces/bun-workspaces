import path from "path";
import { describe, test, expect } from "bun:test";
import {
  BUN_LOCK_ERRORS,
  parseBunLock,
  readBunLockfile,
  type RelevantBunLock,
} from "../../../src/internal/bun/bunLock";

const rootDirectory = process.env.BW_PROJECT_PATH as string;

describe("bun.lock utilities", () => {
  describe("parseBunLock", () => {
    test("parses minimal JSONC lockfile", () => {
      expect(
        parseBunLock(`{
        "lockfileVersion": 1, // this is jsonc
        /* this is jsonc */
      }`),
      ).toEqual({
        lockfileVersion: 1,
        workspaces: {},
      });
    });

    test("parses lockfile with workspaces", () => {
      expect(
        parseBunLock(`{
      "lockfileVersion": 1, // this is jsonc
      /* this is jsonc */
      "workspaces": {
        "application-a": {
          "name": "application-a"
        }
      }
    }`),
      ).toEqual({
        lockfileVersion: 1,
        workspaces: {
          "application-a": {
            name: "application-a",
          },
        },
      });
    });

    test("returns error for malformed JSON", () => {
      expect(
        parseBunLock(`{
        "lockfileVersion": 1, // this is jsonc
        /* this is jsonc */
      `),
      ).toBeInstanceOf(BUN_LOCK_ERRORS.MalformedBunLock);
    });

    test("returns error for non-object JSON types", () => {
      expect(parseBunLock(`[]`)).toBeInstanceOf(
        BUN_LOCK_ERRORS.MalformedBunLock,
      );
      expect(parseBunLock(`1`)).toBeInstanceOf(
        BUN_LOCK_ERRORS.MalformedBunLock,
      );
      expect(parseBunLock(`null`)).toBeInstanceOf(
        BUN_LOCK_ERRORS.MalformedBunLock,
      );
    });

    test("returns error for unsupported lockfile version", () => {
      expect(
        parseBunLock(`{
        /* this is jsonc */
        "lockfileVersion": 2, // this is jsonc
      }`),
      ).toBeInstanceOf(BUN_LOCK_ERRORS.UnsupportedBunLockVersion);

      expect(
        parseBunLock(`{
        /* this is jsonc */
        "lockfileVersion": -1, // this is jsonc
      }`),
      ).toBeInstanceOf(BUN_LOCK_ERRORS.UnsupportedBunLockVersion);
    });

    test("returns error for missing lockfile version", () => {
      expect(
        parseBunLock(`{
        /* this is jsonc */
      }`),
      ).toBeInstanceOf(BUN_LOCK_ERRORS.UnsupportedBunLockVersion);

      expect(
        (
          parseBunLock(`{
        /* this is jsonc */
      }`) as Error
        ).message,
      ).toContain("could not find property lockfileVersion");
    });
  });

  describe("readBunLockfile", () => {
    test("returns error for nonexistent path", () => {
      expect(readBunLockfile("does-not-exist")).toBeInstanceOf(
        BUN_LOCK_ERRORS.BunLockNotFound,
      );
    });

    test("reads project lockfile from directory", () => {
      const projectBunLock = readBunLockfile(rootDirectory) as RelevantBunLock;

      expect(projectBunLock).toEqual({
        lockfileVersion: 1,
        workspaces: expect.any(Object),
      });

      const {
        "workspaces/packages/bun-workspaces": bunWorkspaces,
        "workspaces/web/documentation-website": documentationWebsite,
      } = projectBunLock.workspaces;

      expect({ bunWorkspaces, documentationWebsite }).toEqual({
        bunWorkspaces: expect.any(Object),
        documentationWebsite: expect.any(Object),
      });

      expect(
        projectBunLock.workspaces["workspaces/packages/bun-workspaces"].name,
      ).toBe("bun-workspaces");
      expect(
        projectBunLock.workspaces["workspaces/web/documentation-website"].name,
      ).toBe("documentation-website");
    });

    test("reads project lockfile from file path", () => {
      const projectBunLock = readBunLockfile(rootDirectory) as RelevantBunLock;

      expect(readBunLockfile(path.join(rootDirectory, "bun.lock"))).toEqual(
        projectBunLock,
      );
    });
  });
});
