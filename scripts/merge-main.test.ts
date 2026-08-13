import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import {
  parseMergeMainArguments,
  resolveCommitRefs,
  sanitizedGitEnvironment,
  submitCommits,
} from "./merge-main";

const temporaryRoots: string[] = [];
const integrationTimeout = 30_000;
const isolatedEnvironment: NodeJS.ProcessEnv = {
  ...process.env,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_SYSTEM: "/dev/null",
  LANG: "C",
  LC_ALL: "C",
};

interface Fixture {
  readonly remote: string;
  readonly repository: string;
  readonly root: string;
}

interface WorktreeSnapshot {
  readonly branch: string;
  readonly checkSource: string;
  readonly head: string;
  readonly status: string;
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { force: true, recursive: true });
  }
});

function git(cwd: string, arguments_: readonly string[]): string {
  return execFileSync("git", [...arguments_], {
    cwd,
    encoding: "utf8",
    env: isolatedEnvironment,
    maxBuffer: 16 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function write(root: string, path: string, contents: string): void {
  const destination = join(root, path);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, contents);
}

function commit(root: string, path: string, contents: string, message: string): string {
  write(root, path, contents);
  git(root, ["add", "--", path]);
  git(root, ["commit", "-m", message]);
  return git(root, ["rev-parse", "HEAD"]);
}

function fixture(): Fixture {
  const root = mkdtempSync(join(tmpdir(), "personal-merge-test-"));
  temporaryRoots.push(root);
  const remote = join(root, "remote.git");
  const repository = join(root, "repository");
  mkdirSync(remote);
  mkdirSync(repository);
  git(remote, ["init", "--bare", "--initial-branch=main"]);
  git(repository, ["init", "--initial-branch=main"]);
  git(repository, ["config", "user.name", "Merge Test"]);
  git(repository, ["config", "user.email", "merge-test@example.invalid"]);
  git(repository, ["config", "commit.gpgSign", "false"]);
  git(repository, ["config", "core.hooksPath", "/dev/null"]);
  write(repository, ".gitignore", "node_modules/\n");
  write(
    repository,
    "package.json",
    `${JSON.stringify({
      name: "merge-main-fixture",
      private: true,
      scripts: { check: "bun check.ts" },
    }, null, 2)}\n`,
  );
  write(
    repository,
    "check.ts",
    `import { existsSync } from "node:fs";\nif (!existsSync("package.json")) process.exit(1);\n`,
  );
  execFileSync(process.execPath, ["install"], {
    cwd: repository,
    env: isolatedEnvironment,
    stdio: "ignore",
  });
  git(repository, ["add", "--all"]);
  git(repository, ["commit", "-m", "base"]);
  git(repository, ["remote", "add", "origin", remote]);
  git(repository, ["push", "--set-upstream", "origin", "main"]);
  return { remote, repository, root };
}

function taskWorktree(value: Fixture, name: string): string {
  const path = join(value.root, name);
  git(value.repository, ["worktree", "add", "-b", name, path, "origin/main"]);
  git(path, ["config", "user.name", "Merge Test"]);
  git(path, ["config", "user.email", "merge-test@example.invalid"]);
  return path;
}

function snapshot(worktree: string): WorktreeSnapshot {
  return {
    branch: git(worktree, ["branch", "--show-current"]),
    checkSource: readFileSync(join(worktree, "check.ts"), "utf8"),
    head: git(worktree, ["rev-parse", "HEAD"]),
    status: git(worktree, ["status", "--porcelain=v2", "--untracked-files=all"]),
  };
}

function remoteTip(value: Fixture): string {
  return git(value.remote, ["rev-parse", "refs/heads/main"]);
}

describe("merge-main arguments and environment", () => {
  test("parses ordered repeated commits and a bounded retry count", () => {
    expect(parseMergeMainArguments([
      "submit",
      "--commit", "HEAD~1",
      "--label", "site polish",
      "--commit", "HEAD",
      "--retries", "7",
    ])).toEqual({
      command: "submit",
      commits: ["HEAD~1", "HEAD"],
      label: "site polish",
      retries: 7,
    });
  });

  test("requires commits and a printable label and rejects unbounded retries", () => {
    expect(() => parseMergeMainArguments(["submit", "--label", "missing commits"]))
      .toThrow("at least one --commit is required");
    expect(() => parseMergeMainArguments(["submit", "--commit", "HEAD"]))
      .toThrow("--label is required");
    expect(() => parseMergeMainArguments([
      "submit", "--commit", "HEAD", "--label", "x", "--retries", "21",
    ])).toThrow("retries must be an integer from 0 to 20");
  });

  test("removes repository overrides and fixes the Git locale", () => {
    const environment = sanitizedGitEnvironment({
      KEEP_ME: "yes",
      GIT_ALTERNATE_OBJECT_DIRECTORIES: "/unsafe/alternate",
      GIT_COMMON_DIR: "/unsafe/common",
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: "remote.origin.url",
      GIT_CONFIG_PARAMETERS: "'remote.origin.url=/unsafe/remote'",
      GIT_CONFIG_VALUE_0: "/unsafe/remote",
      GIT_DIR: "/unsafe/git",
      GIT_EXEC_PATH: "/unsafe/bin",
      GIT_INDEX_FILE: "/unsafe/index",
      GIT_NAMESPACE: "unsafe",
      GIT_OBJECT_DIRECTORY: "/unsafe/objects",
      GIT_QUARANTINE_PATH: "/unsafe/quarantine",
      GIT_REPLACE_REF_BASE: "refs/unsafe/",
      GIT_SHALLOW_FILE: "/unsafe/shallow",
      GIT_WORK_TREE: "/unsafe/tree",
      LANG: "es_PR.UTF-8",
      LC_ALL: "es_PR.UTF-8",
    });
    expect(environment.KEEP_ME).toBe("yes");
    expect(environment.GIT_NO_REPLACE_OBJECTS).toBe("1");
    expect(environment.GIT_TERMINAL_PROMPT).toBe("0");
    expect(environment.LANG).toBe("C");
    expect(environment.LC_ALL).toBe("C");
    for (const name of [
      "GIT_ALTERNATE_OBJECT_DIRECTORIES",
      "GIT_COMMON_DIR",
      "GIT_CONFIG_COUNT",
      "GIT_CONFIG_KEY_0",
      "GIT_CONFIG_PARAMETERS",
      "GIT_CONFIG_VALUE_0",
      "GIT_DIR",
      "GIT_EXEC_PATH",
      "GIT_INDEX_FILE",
      "GIT_NAMESPACE",
      "GIT_OBJECT_DIRECTORY",
      "GIT_QUARANTINE_PATH",
      "GIT_REPLACE_REF_BASE",
      "GIT_SHALLOW_FILE",
      "GIT_WORK_TREE",
    ]) {
      expect(environment[name]).toBeUndefined();
    }
  });
});

describe("merge-main integration", () => {
  test("rebuilds after losing a race and leaves the submitter worktree unchanged", async () => {
    const value = fixture();
    const task = taskWorktree(value, "task-site");
    const competitor = taskWorktree(value, "task-notes");
    const taskOid = commit(task, "site.txt", "site\n", "add site");
    commit(competitor, "notes.txt", "notes\n", "add notes");
    const before = snapshot(task);
    const worktreesBefore = git(value.repository, ["worktree", "list", "--porcelain"]);
    let validations = 0;

    const result = await submitCommits(
      { commits: [taskOid], label: "site", retries: 2 },
      {
        afterValidation: ({ attempt }) => {
          validations += 1;
          if (attempt === 1) {
            git(competitor, ["push", "origin", "HEAD:refs/heads/main"]);
          }
        },
        cwd: task,
        environment: isolatedEnvironment,
        log: () => {},
      },
    );

    expect(result.attempts).toBe(2);
    expect(validations).toBe(2);
    expect(git(value.remote, ["show", "refs/heads/main:site.txt"])).toBe("site");
    expect(git(value.remote, ["show", "refs/heads/main:notes.txt"])).toBe("notes");
    expect(git(value.remote, ["merge-base", "--is-ancestor", result.candidateOid, remoteTip(value)]))
      .toBe("");
    expect(snapshot(task)).toEqual(before);
    expect(git(value.repository, ["worktree", "list", "--porcelain"]))
      .toBe(worktreesBefore);
  }, integrationTimeout);

  test("rejects successful validation that leaves an untracked file", async () => {
    const value = fixture();
    const task = taskWorktree(value, "task-unsafe");
    const baseOid = remoteTip(value);
    const taskOid = commit(
      task,
      "check.ts",
      `import { writeFileSync } from "node:fs";\nwriteFileSync("generated.txt", "unsafe\\n");\n`,
      "make check dirty",
    );
    const before = snapshot(task);
    const worktreesBefore = git(value.repository, ["worktree", "list", "--porcelain"]);

    await expect(submitCommits(
      { commits: [taskOid], label: "unsafe", retries: 1 },
      {
        cwd: task,
        environment: isolatedEnvironment,
        log: () => {},
      },
    )).rejects.toThrow("validation left tracked or untracked changes");

    expect(remoteTip(value)).toBe(baseOid);
    expect(snapshot(task)).toEqual(before);
    expect(git(value.repository, ["worktree", "list", "--porcelain"]))
      .toBe(worktreesBefore);
  }, integrationTimeout);

  test("rejects merge commits before creating a candidate", () => {
    const value = fixture();
    const task = taskWorktree(value, "task-merge");
    const other = taskWorktree(value, "task-parent");
    commit(task, "left.txt", "left\n", "left");
    const otherOid = commit(other, "right.txt", "right\n", "right");
    git(task, ["merge", "--no-ff", otherOid, "-m", "merge branches"]);
    const mergeOid = git(task, ["rev-parse", "HEAD"]);

    expect(() => resolveCommitRefs(task, [mergeOid], isolatedEnvironment))
      .toThrow(`resolves to merge commit ${mergeOid}`);
  }, integrationTimeout);

  test("does not publish reachable annotated tags when push.followTags is enabled", async () => {
    const value = fixture();
    const task = taskWorktree(value, "task-no-tags");
    git(task, ["config", "push.followTags", "true"]);
    git(task, ["tag", "-a", "local-only", "origin/main", "-m", "local only"]);
    const taskOid = commit(task, "tag-safe.txt", "safe\n", "tag-safe change");

    await submitCommits(
      { commits: [taskOid], label: "no tags", retries: 0 },
      {
        cwd: task,
        environment: isolatedEnvironment,
        log: () => {},
      },
    );

    expect(git(value.remote, ["for-each-ref", "--format=%(refname)", "refs/tags"])).toBe("");
  }, integrationTimeout);

  test("explains when protected main requires a pull-request queue", async () => {
    const value = fixture();
    const task = taskWorktree(value, "task-protected");
    const taskOid = commit(task, "protected.txt", "protected\n", "protected change");
    const baseOid = remoteTip(value);
    const hook = join(value.remote, "hooks", "pre-receive");
    writeFileSync(
      hook,
      `#!/bin/sh\nwhile read old new ref; do\n  if [ "$ref" = "refs/heads/main" ]; then\n    echo "protected branch hook declined" >&2\n    exit 1\n  fi\ndone\n`,
    );
    chmodSync(hook, 0o755);

    await expect(submitCommits(
      { commits: [taskOid], label: "protected", retries: 0 },
      {
        cwd: task,
        environment: isolatedEnvironment,
        log: () => {},
      },
    )).rejects.toThrow("branch protection or a repository ruleset requires a pull request");
    expect(remoteTip(value)).toBe(baseOid);
  }, integrationTimeout);
});
