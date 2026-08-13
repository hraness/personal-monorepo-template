import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const defaultRetries = 4;
const maximumRetries = 20;
const maximumOutputBytes = 16 * 1024 * 1024;
const objectIdPattern = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;

export const mergeMainUsage = `Usage:
  bun run merge:queue -- submit --commit REF [--commit REF ...] --label TEXT [--retries 0-${maximumRetries}]

This command requires direct non-force pushes to origin/main. Repositories that
protect main should use their provider's pull-request merge queue.`;

export interface SubmitCommand {
  readonly command: "submit";
  readonly commits: readonly string[];
  readonly label: string;
  readonly retries: number;
}

interface ProcessResult {
  readonly status: number;
  readonly stderr: string;
  readonly stdout: string;
}

export interface CandidateContext {
  readonly attempt: number;
  readonly baseOid: string;
  readonly candidateOid: string;
  readonly worktree: string;
}

export interface SubmitOptions {
  readonly afterValidation?: (context: CandidateContext) => void | Promise<void>;
  readonly cwd?: string;
  readonly environment?: Readonly<NodeJS.ProcessEnv>;
  readonly log?: (message: string) => void;
}

export interface SubmitResult {
  readonly attempts: number;
  readonly candidateOid: string;
  readonly remoteOid: string;
}

interface ValidatedCandidate {
  readonly candidateOid: string;
  readonly dispose: () => void;
}

function usageError(message: string): Error {
  return new Error(`${message}\n\n${mergeMainUsage}`);
}

function containsControlCharacter(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint !== undefined && (codePoint <= 0x1f || codePoint === 0x7f)) {
      return true;
    }
  }
  return false;
}

function checkedRef(value: string): string {
  if (
    value.length === 0
    || value.length > 1_024
    || value.startsWith("-")
    || containsControlCharacter(value)
  ) {
    throw usageError(`invalid commit ref: ${JSON.stringify(value)}`);
  }
  return value;
}

function checkedLabel(value: string): string {
  if (
    value.trim().length === 0
    || value.length > 160
    || containsControlCharacter(value)
  ) {
    throw usageError("label must contain 1-160 printable characters");
  }
  return value;
}

function checkedRetries(value: string): number {
  if (!/^(?:0|[1-9][0-9]*)$/u.test(value)) {
    throw usageError(`retries must be an integer from 0 to ${maximumRetries}`);
  }
  const retries = Number(value);
  if (!Number.isSafeInteger(retries) || retries > maximumRetries) {
    throw usageError(`retries must be an integer from 0 to ${maximumRetries}`);
  }
  return retries;
}

export function parseMergeMainArguments(arguments_: readonly string[]): SubmitCommand {
  if (arguments_[0] !== "submit") {
    throw usageError("expected the submit command");
  }

  const commits: string[] = [];
  let label: string | null = null;
  let retries = defaultRetries;
  let retriesSeen = false;

  for (let index = 1; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--commit") {
      const value = arguments_[index + 1];
      if (value === undefined) throw usageError("--commit requires a value");
      commits.push(checkedRef(value));
      index += 1;
      continue;
    }
    if (argument === "--label") {
      if (label !== null) throw usageError("--label may be provided only once");
      const value = arguments_[index + 1];
      if (value === undefined) throw usageError("--label requires a value");
      label = checkedLabel(value);
      index += 1;
      continue;
    }
    if (argument === "--retries") {
      if (retriesSeen) throw usageError("--retries may be provided only once");
      const value = arguments_[index + 1];
      if (value === undefined) throw usageError("--retries requires a value");
      retries = checkedRetries(value);
      retriesSeen = true;
      index += 1;
      continue;
    }
    throw usageError(`unknown argument: ${argument}`);
  }

  if (commits.length === 0) throw usageError("at least one --commit is required");
  if (label === null) throw usageError("--label is required");
  return { command: "submit", commits, label, retries };
}

export function sanitizedGitEnvironment(
  environment: Readonly<NodeJS.ProcessEnv> = process.env,
): NodeJS.ProcessEnv {
  const result = { ...environment };
  // Git accepts graph, config, executable, and helper overrides through its
  // environment. None are required here; ordinary credential configuration
  // and SSH_AUTH_SOCK remain available for the eventual authenticated push.
  for (const variable of Object.keys(result)) {
    if (variable.startsWith("GIT_")) delete result[variable];
  }
  result.GIT_NO_REPLACE_OBJECTS = "1";
  result.GIT_TERMINAL_PROMPT = "0";
  result.LANG = "C";
  result.LC_ALL = "C";
  return result;
}

function runProcess(
  program: string,
  arguments_: readonly string[],
  cwd: string,
  environment: NodeJS.ProcessEnv,
): ProcessResult {
  const result = spawnSync(program, [...arguments_], {
    cwd,
    encoding: "utf8",
    env: environment,
    maxBuffer: maximumOutputBytes,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const error = result.error === undefined ? "" : `${result.error.message}\n`;
  const signal = result.signal === null ? "" : `terminated by ${result.signal}\n`;
  return {
    status: result.status ?? 1,
    stderr: `${result.stderr ?? ""}${error}${signal}`,
    stdout: result.stdout ?? "",
  };
}

function commandOutput(result: ProcessResult): string {
  return `${result.stdout}${result.stderr}`.trim();
}

function runGit(
  cwd: string,
  arguments_: readonly string[],
  environment: NodeJS.ProcessEnv,
): ProcessResult {
  return runProcess("git", [
    "-c", "core.fsmonitor=false",
    "-c", "core.hooksPath=/dev/null",
    "-c", "protocol.ext.allow=never",
    ...arguments_,
  ], cwd, environment);
}

function requireGit(
  cwd: string,
  arguments_: readonly string[],
  environment: NodeJS.ProcessEnv,
  failure: string,
): string {
  const result = runGit(cwd, arguments_, environment);
  if (result.status !== 0) {
    const detail = commandOutput(result);
    throw new Error(detail.length === 0 ? failure : `${failure}:\n${detail}`);
  }
  return result.stdout.trim();
}

function requireBun(
  cwd: string,
  arguments_: readonly string[],
  environment: NodeJS.ProcessEnv,
  failure: string,
): void {
  const result = runProcess(process.execPath, arguments_, cwd, environment);
  if (result.status !== 0) {
    const detail = commandOutput(result);
    throw new Error(detail.length === 0 ? failure : `${failure}:\n${detail}`);
  }
}

function exactObjectId(value: string, description: string): string {
  const oid = value.trim();
  if (!objectIdPattern.test(oid)) {
    throw new Error(`${description} did not resolve to one exact Git object ID`);
  }
  return oid;
}

function repositoryRoot(cwd: string, environment: NodeJS.ProcessEnv): string {
  const inside = requireGit(
    cwd,
    ["rev-parse", "--is-inside-work-tree"],
    environment,
    "the submit command must run inside a Git worktree",
  );
  if (inside !== "true") throw new Error("the submit command must run inside a Git worktree");
  return resolve(requireGit(
    cwd,
    ["rev-parse", "--show-toplevel"],
    environment,
    "could not locate the submitter worktree",
  ));
}

export function resolveCommitRefs(
  repository: string,
  refs: readonly string[],
  environment: Readonly<NodeJS.ProcessEnv> = process.env,
): readonly string[] {
  const cleanEnvironment = sanitizedGitEnvironment(environment);
  return refs.map((ref) => {
    const oid = exactObjectId(requireGit(
      repository,
      ["rev-parse", "--verify", "--end-of-options", `${checkedRef(ref)}^{commit}`],
      cleanEnvironment,
      `commit ref ${JSON.stringify(ref)} does not resolve to a commit`,
    ), `commit ref ${JSON.stringify(ref)}`);
    const commitObject = requireGit(
      repository,
      ["cat-file", "-p", oid],
      cleanEnvironment,
      `could not inspect commit ${oid}`,
    );
    const header = commitObject.split("\n\n", 1)[0] ?? "";
    const parentCount = header.split("\n").filter((line) => line.startsWith("parent ")).length;
    if (parentCount > 1) {
      throw new Error(`commit ${ref} resolves to merge commit ${oid}; submit non-merge commits only`);
    }
    return oid;
  });
}

function fetchOriginMain(repository: string, environment: NodeJS.ProcessEnv): string {
  requireGit(
    repository,
    ["fetch", "--no-tags", "origin", "+refs/heads/main:refs/remotes/origin/main"],
    environment,
    "could not fetch origin/main",
  );
  return exactObjectId(requireGit(
    repository,
    ["rev-parse", "--verify", "refs/remotes/origin/main^{commit}"],
    environment,
    "origin/main does not resolve to a commit",
  ), "origin/main");
}

function isAncestor(
  repository: string,
  ancestor: string,
  descendant: string,
  environment: NodeJS.ProcessEnv,
): boolean {
  const result = runGit(
    repository,
    ["merge-base", "--is-ancestor", ancestor, descendant],
    environment,
  );
  if (result.status === 0) return true;
  if (result.status === 1) return false;
  throw new Error(`could not compare Git commits:\n${commandOutput(result)}`);
}

function replayCommit(
  repository: string,
  worktree: string,
  oid: string,
  baseOid: string,
  environment: NodeJS.ProcessEnv,
): void {
  if (isAncestor(repository, oid, baseOid, environment)) return;
  const result = runGit(
    worktree,
    [
      "-c", "commit.gpgSign=false",
      "-c", "core.hooksPath=/dev/null",
      "-c", "user.name=Template Merge Queue",
      "-c", "user.email=merge-queue@localhost",
      "cherry-pick", "--no-edit", oid,
    ],
    environment,
  );
  if (result.status === 0) return;

  const conflicts = runGit(
    worktree,
    ["diff", "--name-only", "--diff-filter=U"],
    environment,
  );
  const detail = commandOutput(result).toLowerCase();
  const empty = detail.includes("cherry-pick is now empty")
    || detail.includes("previous cherry-pick is now empty")
    || detail.includes("nothing to commit");
  if (conflicts.status === 0 && conflicts.stdout.trim().length === 0 && empty) {
    const skipped = runGit(worktree, ["cherry-pick", "--skip"], environment);
    if (skipped.status === 0) return;
  }

  const conflictDetail = conflicts.stdout.trim();
  throw new Error([
    `could not replay commit ${oid}`,
    conflictDetail.length === 0 ? null : `conflicts:\n${conflictDetail}`,
    commandOutput(result),
  ].filter((line): line is string => line !== null && line.length > 0).join("\n"));
}

function cleanValidatedCandidate(
  worktree: string,
  candidateOid: string,
  environment: NodeJS.ProcessEnv,
): void {
  const headOid = exactObjectId(requireGit(
    worktree,
    ["rev-parse", "--verify", "HEAD^{commit}"],
    environment,
    "could not inspect the validated candidate HEAD",
  ), "validated candidate HEAD");
  if (headOid !== candidateOid) {
    throw new Error(`validation changed HEAD from ${candidateOid} to ${headOid}`);
  }

  const headTree = exactObjectId(requireGit(
    worktree,
    ["rev-parse", "--verify", "HEAD^{tree}"],
    environment,
    "could not inspect the validated candidate tree",
  ), "validated candidate tree");
  const indexTree = exactObjectId(requireGit(
    worktree,
    ["write-tree"],
    environment,
    "could not inspect the validated candidate index",
  ), "validated candidate index");
  if (indexTree !== headTree) {
    throw new Error("validation left index changes; refusing to push an unsealed candidate");
  }

  const trackedFlags = runGit(worktree, ["ls-files", "-v", "-z", "--"], environment);
  if (trackedFlags.status !== 0) {
    throw new Error(`could not verify candidate index flags:\n${commandOutput(trackedFlags)}`);
  }
  const unsafeIndexEntries = trackedFlags.stdout
    .split("\0")
    .filter((entry) => entry.length > 0 && /^[a-zS] /u.test(entry));
  if (unsafeIndexEntries.length > 0) {
    throw new Error(
      `validation left unsafe assume-unchanged or skip-worktree index flags:\n${unsafeIndexEntries.join("\n")}`,
    );
  }

  const fsmonitorFlags = runGit(worktree, ["ls-files", "-f", "-z", "--"], environment);
  if (fsmonitorFlags.status !== 0) {
    throw new Error(`could not verify candidate fsmonitor flags:\n${commandOutput(fsmonitorFlags)}`);
  }
  const fsmonitorValidEntries = fsmonitorFlags.stdout
    .split("\0")
    .filter((entry) => entry.length > 0 && /^[a-z] /u.test(entry));
  if (fsmonitorValidEntries.length > 0) {
    throw new Error(
      `validation left unsafe fsmonitor-valid index flags:\n${fsmonitorValidEntries.join("\n")}`,
    );
  }

  const status = runGit(
    worktree,
    [
      "status",
      "--porcelain=v2",
      "-z",
      "--untracked-files=all",
      "--ignore-submodules=none",
    ],
    environment,
  );
  if (status.status !== 0) {
    throw new Error(`could not verify the validated worktree:\n${commandOutput(status)}`);
  }
  if (status.stdout.length !== 0) {
    const entries = status.stdout
      .split("\0")
      .filter((entry) => entry.length > 0)
      .slice(0, 12)
      .join("\n");
    throw new Error(`validation left tracked or untracked changes; refusing to push:\n${entries}`);
  }
}

function branchProtectionFailure(result: ProcessResult): boolean {
  const output = commandOutput(result).toLowerCase();
  return output.includes("protected branch")
    || output.includes("gh006")
    || output.includes("gh013")
    || output.includes("changes must be made through a pull request")
    || output.includes("protected branch hook declined")
    || output.includes("not permitted to update")
    || output.includes("repository rule violations");
}

function cleanupWorktree(
  repository: string,
  temporaryRoot: string,
  worktree: string,
  added: boolean,
  environment: NodeJS.ProcessEnv,
): void {
  if (added) {
    const removal = runGit(repository, ["worktree", "remove", "--force", worktree], environment);
    if (removal.status !== 0) {
      throw new Error(`could not remove task-owned temporary worktree ${worktree}:\n${commandOutput(removal)}`);
    }
  }
  rmSync(temporaryRoot, { force: true, recursive: true });
}

async function buildAndValidateCandidate(
  repository: string,
  commits: readonly string[],
  baseOid: string,
  attempt: number,
  environment: NodeJS.ProcessEnv,
  options: SubmitOptions,
): Promise<ValidatedCandidate> {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "personal-merge-"));
  const worktree = join(temporaryRoot, "candidate");
  let added = false;
  let handedOff = false;
  try {
    requireGit(
      repository,
      ["worktree", "add", "--detach", worktree, baseOid],
      environment,
      "could not create a task-owned detached worktree",
    );
    added = true;
    for (const oid of commits) replayCommit(repository, worktree, oid, baseOid, environment);
    const candidateOid = exactObjectId(requireGit(
      worktree,
      ["rev-parse", "--verify", "HEAD^{commit}"],
      environment,
      "could not resolve candidate HEAD",
    ), "candidate HEAD");

    requireBun(
      worktree,
      ["install", "--frozen-lockfile"],
      environment,
      `frozen install failed for candidate ${candidateOid}`,
    );
    requireBun(
      worktree,
      ["run", "check"],
      environment,
      `repository check failed for candidate ${candidateOid}`,
    );
    cleanValidatedCandidate(worktree, candidateOid, environment);
    await options.afterValidation?.({ attempt, baseOid, candidateOid, worktree });
    cleanValidatedCandidate(worktree, candidateOid, environment);

    let disposed = false;
    handedOff = true;
    return {
      candidateOid,
      dispose: () => {
        if (disposed) return;
        cleanupWorktree(repository, temporaryRoot, worktree, added, environment);
        disposed = true;
      },
    };
  } finally {
    if (!handedOff) cleanupWorktree(repository, temporaryRoot, worktree, added, environment);
  }
}

export async function submitCommits(
  command: Omit<SubmitCommand, "command">,
  options: SubmitOptions = {},
): Promise<SubmitResult> {
  const environment = sanitizedGitEnvironment(options.environment);
  const repository = repositoryRoot(options.cwd ?? process.cwd(), environment);
  const commits = resolveCommitRefs(repository, command.commits, environment);
  const label = checkedLabel(command.label);
  const retries = command.retries;
  if (!Number.isSafeInteger(retries) || retries < 0 || retries > maximumRetries) {
    throw new Error(`retries must be an integer from 0 to ${maximumRetries}`);
  }
  const log = options.log ?? ((message: string) => console.log(message));

  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    const baseOid = fetchOriginMain(repository, environment);
    log(`[${label}] attempt ${attempt}/${retries + 1} on ${baseOid}`);
    const candidate = await buildAndValidateCandidate(
      repository,
      commits,
      baseOid,
      attempt,
      environment,
      options,
    );
    let confirmedResult: SubmitResult | null = null;

    try {
      const freshBeforePush = fetchOriginMain(repository, environment);
      if (isAncestor(repository, candidate.candidateOid, freshBeforePush, environment)) {
        confirmedResult = {
          attempts: attempt,
          candidateOid: candidate.candidateOid,
          remoteOid: freshBeforePush,
        };
        return confirmedResult;
      }
      if (freshBeforePush !== baseOid) {
        if (attempt <= retries) {
          log(`[${label}] origin/main moved to ${freshBeforePush}; rebuilding and revalidating`);
          continue;
        }
        break;
      }

      const push = runGit(
        repository,
        ["push", "--no-follow-tags", "origin", `${candidate.candidateOid}:refs/heads/main`],
        environment,
      );
      let confirmedRemote: string;
      try {
        confirmedRemote = fetchOriginMain(repository, environment);
      } catch (error: unknown) {
        throw new Error(
          `could not confirm whether candidate ${candidate.candidateOid} reached origin/main after push:\n${commandOutput(push)}`,
          { cause: error },
        );
      }
      if (isAncestor(repository, candidate.candidateOid, confirmedRemote, environment)) {
        confirmedResult = {
          attempts: attempt,
          candidateOid: candidate.candidateOid,
          remoteOid: confirmedRemote,
        };
        return confirmedResult;
      }
      if (confirmedRemote !== baseOid) {
        if (attempt <= retries) {
          log(`[${label}] another submission won the push race; rebuilding on ${confirmedRemote}`);
          continue;
        }
        break;
      }
      if (branchProtectionFailure(push)) {
        throw new Error(
          `origin/main rejected the ordinary push because branch protection or a repository ruleset requires a pull request. This serializer only works when direct non-force pushes to main are allowed; use the provider's pull-request merge queue instead.\n${commandOutput(push)}`,
        );
      }
      throw new Error(`ordinary non-force push of ${candidate.candidateOid} failed:\n${commandOutput(push)}`);
    } finally {
      try {
        candidate.dispose();
      } catch (error: unknown) {
        if (confirmedResult === null) throw error;
        log(
          `[${label}] warning: origin/main contains ${confirmedResult.candidateOid}, but temporary-worktree cleanup failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  throw new Error(
    `origin/main kept moving while integrating ${label}; exhausted ${retries} race retries without pushing an unvalidated candidate`,
  );
}

export async function runMergeMainCli(arguments_: readonly string[]): Promise<SubmitResult> {
  const command = parseMergeMainArguments(arguments_);
  const result = await submitCommits(command);
  console.log(
    `[${command.label}] merged ${result.candidateOid}; confirmed reachable from origin/main at ${result.remoteOid}`,
  );
  return result;
}

if (import.meta.main) {
  try {
    await runMergeMainCli(process.argv.slice(2));
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
