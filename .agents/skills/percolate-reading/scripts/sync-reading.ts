import { resolve } from "node:path";

import {
  DEFAULT_REPOSITORY_ROOT,
  readingInbox,
  syncReading,
  type ReadingInboxReport,
} from "./reading";

export type ReadingCommand =
  | { readonly mode: "sync" | "check"; readonly repositoryRoot: string }
  | { readonly mode: "inbox"; readonly repositoryRoot: string; readonly json: boolean }
  | { readonly mode: "help"; readonly repositoryRoot: string };

const usage = `Usage:
  bun run reading:generate [--root <repository>]
  bun run reading:check [--root <repository>]
  bun run reading:inbox [--json] [--root <repository>]

Modes:
  default   Validate every reading note and atomically update the generated module.
  --check   Validate every note and fail on generated drift without writing.
  --inbox   List manifest-backed web captures with no related reading note without writing.
`;

function safeTerminalText(value: string): string {
  return [...value].filter((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint === 9 || codePoint === 10 || codePoint === 13
      || (codePoint >= 32 && codePoint !== 127);
  }).join("");
}

export function parseReadingCommand(
  arguments_: readonly string[],
  defaultRoot = DEFAULT_REPOSITORY_ROOT,
): ReadingCommand {
  let repositoryRoot = defaultRoot;
  let check = false;
  let inbox = false;
  let json = false;
  let help = false;
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--root") {
      const value = arguments_[index + 1];
      if (value === undefined || value.startsWith("--")) throw new Error("--root requires a repository path");
      repositoryRoot = resolve(value);
      index += 1;
    } else if (argument === "--check") {
      check = true;
    } else if (argument === "--inbox") {
      inbox = true;
    } else if (argument === "--json") {
      json = true;
    } else if (argument === "--help" || argument === "-h") {
      help = true;
    } else {
      throw new Error(`unknown option: ${safeTerminalText(argument ?? "")}`);
    }
  }
  if (help) return { mode: "help", repositoryRoot };
  if (check && inbox) throw new Error("--check and --inbox are mutually exclusive");
  if (json && !inbox) throw new Error("--json requires --inbox");
  if (inbox) return { mode: "inbox", repositoryRoot, json };
  return { mode: check ? "check" : "sync", repositoryRoot };
}

function humanInbox(report: ReadingInboxReport): string {
  const lines = [
    `Reading inbox: ${report.pendingCaptures} pending of ${report.totalWebCaptures} manifest-backed web captures.`,
  ];
  for (const item of report.items) {
    lines.push(
      `${item.savedAt}\t${item.reason}\t${item.id}\t${safeTerminalText(item.title)}\t${item.sourceUrl}`,
    );
  }
  return `${lines.join("\n")}\n`;
}

export function runReadingCommand(command: ReadingCommand): string {
  if (command.mode === "help") return usage;
  if (command.mode === "inbox") {
    const report = readingInbox(command.repositoryRoot);
    return command.json ? `${JSON.stringify(report, null, 2)}\n` : humanInbox(report);
  }
  const result = syncReading({
    repositoryRoot: command.repositoryRoot,
    check: command.mode === "check",
  });
  const verb = command.mode === "check"
    ? "Checked"
    : result.status === "written"
      ? "Generated"
      : "Unchanged";
  return `${verb} ${result.entries} reading entr${result.entries === 1 ? "y" : "ies"}: ${result.path}\n`;
}

if (import.meta.main) {
  try {
    process.stdout.write(runReadingCommand(parseReadingCommand(process.argv.slice(2))));
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown reading synchronization error";
    process.stderr.write(`percolate-reading: ${safeTerminalText(message)}\n`);
    process.exitCode = 1;
  }
}
