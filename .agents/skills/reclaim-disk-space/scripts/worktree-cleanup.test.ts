import { describe, expect, test } from "bun:test";

import {
  chooseDefaultRemote,
  classifySafety,
  normalizeTarget,
  parseArgs,
  parseWorktreePorcelain,
} from "./worktree-cleanup";

describe("parseWorktreePorcelain", () => {
  test("parses branch and detached worktrees", () => {
    expect(
      parseWorktreePorcelain(
        [
          "worktree /repo",
          "HEAD aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "branch refs/heads/main",
          "",
          "worktree /private/tmp/task",
          "HEAD bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          "detached",
          "",
        ].join("\n"),
      ),
    ).toEqual([
      {
        path: "/repo",
        head: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        branch: "main",
      },
      {
        path: "/private/tmp/task",
        head: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        branch: null,
      },
    ]);
  });
});

describe("classifySafety", () => {
  const eligible = {
    registered: true,
    primary: false,
    current: false,
    exists: true,
    clean: true,
    merged: true,
    statusReadable: true,
  } as const;

  test("accepts only clean merged secondary worktrees", () => {
    expect(classifySafety(eligible)).toEqual({ eligible: true, reason: "eligible" });
  });

  test.each([
    [{ ...eligible, registered: false }, "unregistered"],
    [{ ...eligible, primary: true }, "primary"],
    [{ ...eligible, current: true }, "current"],
    [{ ...eligible, exists: false }, "missing"],
    [{ ...eligible, statusReadable: false }, "status-error"],
    [{ ...eligible, clean: false }, "dirty"],
    [{ ...eligible, merged: false }, "unmerged"],
  ] as const)("refuses unsafe evidence", (evidence, reason) => {
    expect(classifySafety(evidence)).toEqual({ eligible: false, reason });
  });
});

describe("parseArgs", () => {
  test("defaults to a fetched audit", () => {
    expect(parseArgs([])).toEqual({ fetch: true, json: false, remove: [], target: null });
  });

  test("requires explicit absolute removal paths", () => {
    expect(
      parseArgs(["--remove", "/private/tmp/a", "--remove", "/private/tmp/a", "--remove", "/tmp/b"]),
    ).toEqual({
      fetch: true,
      json: false,
      remove: ["/private/tmp/a", "/tmp/b"],
      target: null,
    });
    expect(() => parseArgs(["--remove", "relative"])).toThrow("absolute path");
  });

  test("forbids stale or machine-readable apply modes", () => {
    expect(() => parseArgs(["--no-fetch", "--remove", "/tmp/a"])).toThrow("audit-only");
    expect(() => parseArgs(["--json", "--remove", "/tmp/a"])).toThrow("--json");
  });

  test("accepts an explicit remote target", () => {
    expect(parseArgs(["--target", "upstream/trunk", "--json"])).toEqual({
      fetch: true,
      json: true,
      remove: [],
      target: "upstream/trunk",
    });
    expect(() => parseArgs(["--target"])).toThrow("requires");
  });
});

describe("target selection", () => {
  test("prefers origin and otherwise requires one unambiguous remote", () => {
    expect(chooseDefaultRemote(["upstream", "origin"])).toBe("origin");
    expect(chooseDefaultRemote(["upstream"])).toBe("upstream");
    expect(() => chooseDefaultRemote([])).toThrow("No Git remote");
    expect(() => chooseDefaultRemote(["upstream", "fork"])).toThrow("Several Git remotes");
  });

  test("normalizes remote refs and handles remote names containing slashes", () => {
    expect(normalizeTarget("refs/remotes/upstream/main", ["upstream"])).toEqual({
      ref: "upstream/main",
      remote: "upstream",
    });
    expect(normalizeTarget("team/fork/trunk", ["team", "team/fork"])).toEqual({
      ref: "team/fork/trunk",
      remote: "team/fork",
    });
    expect(() => normalizeTarget("main", ["origin"])).toThrow("remote-tracking");
  });
});
