import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import remarkParse from "remark-parse";
import { unified } from "unified";
import { parseDocument } from "yaml";

const MAX_READING_NOTE_BYTES = 128 * 1024;
const MAX_CAPTURE_MARKDOWN_BYTES = 32 * 1024 * 1024;
const MAX_CAPTURE_MANIFEST_BYTES = 2 * 1024 * 1024;
const MAX_GENERATED_BYTES = 16 * 1024 * 1024;
const MAX_READING_NOTES = 10_000;
const MAX_INBOX_CAPTURES = 10_000;
const MAX_QUOTES_PER_DIGEST = 4;
const MAX_QUOTED_WORDS_PER_DIGEST = 100;
const MAX_FULL_NOTE_WORDS = 1_000;
const MAX_QUOTE_OCCURRENCES = 1_000;
const MARKDOWN_OMISSION_BARRIER = "\0";
const wordSegmenter = new Intl.Segmenter("en-US", { granularity: "word" });

const commonReadingMetadataKeys = new Set([
  "status",
  "form",
  "slug",
  "source_url",
  "reviewed",
  "authors",
  "publication",
  "published",
]);
const digestReadingMetadataKeys = new Set([
  ...commonReadingMetadataKeys,
  "partial_reviewed",
  "author_metadata_reviewed",
]);
const fullNoteReadingMetadataKeys = new Set([
  ...commonReadingMetadataKeys,
  "source_kind",
  "source_title",
  "saved",
  "summary",
  "full_text_reviewed",
  "evidence_locator",
  "evidence_text_reviewed",
  "republication_basis",
]);
const republicationBases = new Set([
  "existing-publication-reviewed",
  "licensed",
  "permission",
  "public-domain",
  "short-quotation",
]);
const topLevelMetadataKeys = new Set(["title", "type", "tags", "reading", "relations"]);
const privateAcquisitionMethods = new Set([
  "cookie-http",
  "browser-profile",
  "browser-live",
  "browser-cdp",
  "browser-live-current",
  "browser-cdp-current",
]);
const commonTrackingParameters = new Set([
  "_hsenc",
  "_hsmi",
  "dclid",
  "fbclid",
  "gclid",
  "igshid",
  "mc_cid",
  "mc_eid",
  "mkt_tok",
  "msclkid",
  "ref",
  "ref_src",
  "ref_url",
  "referrer",
  "twclid",
  "vero_conv",
  "vero_id",
]);

export type ReadingAuthor = {
  readonly kind?: "organization" | "person";
  readonly name: string;
  readonly url?: string;
};

export type ReadingInlineData =
  | { readonly kind: "text"; readonly value: string }
  | { readonly kind: "emphasis" | "strong"; readonly children: readonly ReadingInlineData[] }
  | { readonly kind: "break" };

export type ReadingParagraphData = {
  readonly kind: "paragraph";
  readonly children: readonly ReadingInlineData[];
};

type ReadingEntryBaseData = {
  readonly slug: string;
  readonly title: string;
  readonly reviewedAt: string;
  readonly source: {
    readonly kind: "article" | "book";
    readonly title: string;
    readonly url: string;
    readonly authors: readonly ReadingAuthor[];
    readonly publication: {
      readonly name: string;
      readonly url: string;
    };
    readonly publishedAt?: string;
  };
  readonly savedAt: string;
};

export type ReadingEntryData = ReadingEntryBaseData & {
  readonly content:
    | {
      readonly kind: "digest";
      readonly gist: string;
      readonly ideas: readonly {
        readonly title: string;
        readonly detail: string;
      }[];
      readonly quotes: readonly {
        readonly text: string;
        readonly attribution: string;
      }[];
    }
    | {
      readonly kind: "note";
      readonly summary: string;
      readonly paragraphs: readonly ReadingParagraphData[];
      readonly citation: readonly ReadingInlineData[];
    };
};

export type ReadingInboxItem = {
  readonly id: string;
  readonly title: string;
  readonly sourceUrl: string;
  readonly savedAt: string;
  readonly author?: string;
  readonly status: string;
  readonly scope: string;
  readonly acquisitionMethod: string;
  readonly warningCount: number;
  readonly eligibleByDefault: boolean;
  readonly reason:
    | "no-reading-note"
    | "partial-capture"
    | "private-acquisition"
    | "capture-not-publishable";
};

export type ReadingInboxReport = {
  readonly advisory: true;
  readonly totalWebCaptures: number;
  readonly relatedCaptures: number;
  readonly pendingCaptures: number;
  readonly items: readonly ReadingInboxItem[];
};

type JsonObject = Record<string, unknown>;

type MarkdownDocument = {
  readonly metadata: JsonObject;
  readonly body: string;
};

type ParsedDigestBody = {
  readonly gist: string;
  readonly ideas: readonly { readonly title: string; readonly detail: string }[];
  readonly quotes: readonly { readonly text: string; readonly attribution: string }[];
};

type ParsedFullNoteBody = {
  readonly paragraphs: readonly ReadingParagraphData[];
  readonly citation: readonly ReadingInlineData[];
};

type TextRange = {
  readonly start: number;
  readonly end: number;
};

type CaptureManifest = {
  readonly capturedAt: string;
  readonly savedAt: string;
  readonly canonicalUrl: string;
  readonly status: string;
  readonly scope: string;
  readonly acquisitionMethod: string;
  readonly warningCount: number;
};

type CaptureSource = {
  readonly id: string;
  readonly title: string;
  readonly sourceUrl: string;
  readonly clipped: string;
  readonly author?: string;
  readonly published?: string | null;
  readonly body: string;
  readonly manifest?: CaptureManifest;
  readonly captureStatus?: string;
};

type ValidatedReadingNote = {
  readonly slug: string;
  readonly sourceUrl: string;
  readonly provenanceId: string;
  readonly captureId?: string;
  readonly status: "draft" | "published";
  readonly entry?: ReadingEntryData;
};

export const DEFAULT_REPOSITORY_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);

export function generatedReadingPath(repositoryRoot = DEFAULT_REPOSITORY_ROOT): string {
  return join(
    resolve(repositoryRoot),
    "personal-website/app/reading/entries.generated.ts",
  );
}

function fail(label: string, message: string): never {
  throw new Error(`${label}: ${message}`);
}

function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function record(value: unknown, label: string): JsonObject {
  if (!isRecord(value)) fail(label, "must be an object");
  return value;
}

function allowedKeys(value: JsonObject, allowed: ReadonlySet<string>, label: string): void {
  const unexpected = Object.keys(value).filter((key) => !allowed.has(key)).toSorted();
  if (unexpected.length > 0) fail(label, `has unsupported field(s): ${unexpected.join(", ")}`);
}

function lineString(value: unknown, label: string, maximum = 300): string {
  if (typeof value !== "string") fail(label, "must be a string");
  if (value === "" || value.trim() !== value) fail(label, "must be non-empty with no surrounding whitespace");
  if (value.length > maximum) fail(label, `must contain at most ${maximum} UTF-16 code units`);
  if (/[\p{Cc}\p{Cf}]/u.test(value)) {
    fail(label, "must not contain control or invisible formatting characters");
  }
  return value.normalize("NFC");
}

function optionalLineString(value: unknown, label: string, maximum = 300): string | undefined {
  return value === undefined ? undefined : lineString(value, label, maximum);
}

function booleanTrue(value: unknown, label: string): true | undefined {
  if (value === undefined) return undefined;
  if (value !== true) fail(label, "must be exactly true when present");
  return true;
}

function validDate(value: unknown, label: string): string {
  const date = lineString(value, label, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(date)) fail(label, "must use YYYY-MM-DD");
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date) {
    fail(label, "must be a real calendar date");
  }
  return date;
}

function validReadingDate(value: unknown, label: string): string {
  const date = lineString(value, label, 10);
  const month = /^(\d{4})-(\d{2})$/u.exec(date);
  if (month !== null) {
    const monthNumber = Number(month[2]);
    if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) {
      fail(label, "must contain a real calendar month");
    }
    return date;
  }
  return validDate(date, label);
}

function validSourcePublicationDate(value: unknown, label: string): string {
  const date = lineString(value, label, 10);
  if (/^\d{4}$/u.test(date)) return date;
  return validReadingDate(date, label);
}

function sourcePublishedDate(value: unknown, label: string): string | null | undefined {
  if (value === undefined) return undefined;
  const published = lineString(value, label, 100);
  const variants = published.split(/,\s*(?=\d{4}-\d{2})/u);
  if (variants.length > 1) {
    const resolved = variants.map((variant) => sourcePublishedDate(variant, label));
    const first = resolved[0];
    if (first === undefined || resolved.some((date) => date !== first)) {
      fail(label, "duplicate timestamps must resolve to the same calendar date");
    }
    return first;
  }
  const month = /^(\d{4})-(\d{2})$/u.exec(published);
  if (month !== null) {
    const monthNumber = Number(month[2]);
    if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) {
      fail(label, "must contain a real calendar month");
    }
    return null;
  }
  const match = /^(\d{4}-\d{2}-\d{2})(?:$|T| )/u.exec(published);
  if (match?.[1] === undefined) fail(label, "must start with a YYYY-MM-DD date");
  validDate(match[1], label);
  const normalizedTimestamp = published.length > 10 && published[10] === " "
    ? `${published.slice(0, 10)}T${published.slice(11)}`
    : published;
  if (published.length > 10 && !Number.isFinite(Date.parse(normalizedTimestamp))) {
    fail(label, "must be an ISO-compatible timestamp");
  }
  return match[1];
}

function knownTrackingParameter(name: string, url: URL, hasSubstackRedirect: boolean): boolean {
  const key = name.toLocaleLowerCase("en-US");
  if (key.startsWith("utm_")) return true;
  if (commonTrackingParameters.has(key)) return true;
  if (key === "triedredirect") return true;
  if (key === "r" && (hasSubstackRedirect || url.hostname.endsWith(".substack.com"))) return true;
  if ((url.hostname === "x.com" || url.hostname.endsWith(".x.com")
    || url.hostname === "twitter.com" || url.hostname.endsWith(".twitter.com"))
    && (key === "s" || key === "t")) return true;
  if ((url.hostname === "youtu.be" || url.hostname.endsWith("youtube.com"))
    && (key === "si" || (key === "feature" && url.searchParams.get(name) === "shared"))) return true;
  return false;
}

function httpsUrl(
  value: unknown,
  label: string,
  options: { readonly permitKnownTracking: boolean },
): string {
  const raw = lineString(value, label, 4_096);
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    fail(label, "must be an absolute URL");
  }
  if (parsed.protocol !== "https:") fail(label, "must use HTTPS");
  if (parsed.username !== "" || parsed.password !== "") fail(label, "must not contain credentials");
  if (parsed.hash !== "") fail(label, "must not contain a fragment");
  const parameterNames = [...new Set([...parsed.searchParams.keys()])];
  const hasSubstackRedirect = parameterNames.some(
    (name) => name.toLocaleLowerCase("en-US") === "triedredirect",
  );
  for (const name of parameterNames) {
    if (!knownTrackingParameter(name, parsed, hasSubstackRedirect)) continue;
    if (!options.permitKnownTracking) fail(label, `contains known tracking parameter ${name}`);
    parsed.searchParams.delete(name);
  }
  return parsed.href;
}

function confined(root: string, path: string, label: string): void {
  const child = relative(root, path);
  if (child === "" || isAbsolute(child) || child === ".." || child.startsWith(`..${sep}`)) {
    fail(label, "escapes its owned root");
  }
}

function existingRealFileWithin(root: string, path: string, label: string): string {
  let stats;
  try {
    stats = lstatSync(path);
  } catch {
    fail(label, "is missing");
  }
  if (!stats.isFile() || stats.isSymbolicLink()) {
    fail(label, "must be a regular non-symlink file");
  }
  let realRoot: string;
  let realPath: string;
  try {
    realRoot = realpathSync(root);
    realPath = realpathSync(path);
  } catch {
    fail(label, "cannot be resolved to a real file");
  }
  confined(realRoot, realPath, label);
  return realPath;
}

function readBoundedFile(path: string, maximum: number, label: string): string {
  let stats;
  try {
    stats = lstatSync(path);
  } catch {
    fail(label, "is missing");
  }
  if (!stats.isFile() || stats.isSymbolicLink()) fail(label, "must be a regular non-symlink file");
  if (stats.size > maximum) fail(label, `exceeds the ${maximum}-byte limit`);
  const content = readFileSync(path, "utf8");
  if (content.includes("\0")) fail(label, "contains a NUL byte");
  return content.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
}

function markdownDocument(path: string, maximum: number, label: string): MarkdownDocument {
  const content = readBoundedFile(path, maximum, label);
  const lines = content.split("\n");
  if (lines[0] !== "---") fail(label, "must start with YAML frontmatter");
  const end = lines.findIndex((line, index) => index > 0 && line === "---");
  if (end === -1) fail(label, "has no closing frontmatter delimiter");
  const document = parseDocument(lines.slice(1, end).join("\n"), {
    schema: "core",
    uniqueKeys: true,
  });
  if (document.errors.length > 0) fail(label, "has invalid or duplicate-key YAML frontmatter");
  let parsed: unknown;
  try {
    parsed = document.toJS({ mapAsMap: false, maxAliasCount: 50 }) as unknown;
  } catch {
    fail(label, "has unsafe YAML aliases");
  }
  return {
    metadata: record(parsed, `${label} frontmatter`),
    body: lines.slice(end + 1).join("\n"),
  };
}

function jsonObject(path: string, maximum: number, label: string): JsonObject {
  const content = readBoundedFile(path, maximum, label);
  let parsed: unknown;
  try {
    parsed = JSON.parse(content) as unknown;
  } catch {
    fail(label, "is not valid JSON");
  }
  return record(parsed, label);
}

function wordCount(value: string): number {
  return [...wordSegmenter.segment(value)].filter(({ isWordLike }) => isWordLike).length;
}

function normalizedWhitespace(value: string): string {
  return value.normalize("NFC").replace(/\s+/gu, " ").trim();
}

function assertPublicTextSafety(value: string, label: string): void {
  if (/[\p{Cc}\p{Cf}]/u.test(value)) {
    fail(label, "must not contain control or invisible formatting characters");
  }
  if (value.includes("[[") || value.includes("]]")) {
    fail(label, "must not contain private vault-link syntax");
  }
}

function assertPlainText(value: string, label: string): void {
  assertPublicTextSafety(value, label);
  if (/!?\[[^\]\n]*\]\([^\n)]*\)|`|\*\*|__|<\/?[A-Za-z][^>]*>/u.test(value)) {
    fail(label, "must be plain text without inline Markdown or HTML");
  }
}

function trimBlankLines(lines: readonly string[]): string[] {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start]?.trim() === "") start += 1;
  while (end > start && lines[end - 1]?.trim() === "") end -= 1;
  return lines.slice(start, end);
}

function bodySections(
  body: string,
  title: string,
  expectedHeadings: readonly string[],
  label: string,
): (heading: string, next: string | undefined) => string[] {
  const lines = body.trim().split("\n");
  if (lines[0] !== `# ${title}`) fail(label, "H1 must exactly match frontmatter title");
  const headings = lines.flatMap((line, index) => /^#{1,6}\s/u.test(line) ? [{ line, index }] : []);
  if (headings.length !== expectedHeadings.length
    || headings.some(({ line }, index) => line !== expectedHeadings[index])) {
    fail(label, `sections must appear exactly in order: ${expectedHeadings.join(", ")}`);
  }
  const headingIndex = new Map(headings.map(({ line, index }) => [line, index] as const));
  const firstSection = expectedHeadings[1];
  if (firstSection === undefined) fail(label, "must declare at least one body section");
  if (trimBlankLines(lines.slice(1, headingIndex.get(firstSection))).length > 0) {
    fail(label, `must put no content between the H1 and ${firstSection} heading`);
  }
  return (heading: string, next: string | undefined): string[] => {
    const start = headingIndex.get(heading);
    if (start === undefined) fail(label, `is missing ${heading}`);
    const end = next === undefined ? lines.length : headingIndex.get(next);
    if (end === undefined) fail(label, `is missing ${next}`);
    return trimBlankLines(lines.slice(start + 1, end));
  };
}

function quotePairIsSurrounded(text: string): boolean {
  const surroundingPairs = [
    ["\"", "\""],
    ["'", "'"],
    ["“", "”"],
    ["‘", "’"],
    ["«", "»"],
  ] as const;
  return surroundingPairs.some(([open, close]) => text.startsWith(open) && text.endsWith(close));
}

function parseDigestBody(body: string, title: string, captureId: string, label: string): ParsedDigestBody {
  const hasQuotes = body.split("\n").some((line) => line === "## Quotes");
  const expectedHeadings = [
    `# ${title}`,
    "## Gist",
    "## Ideas",
    ...(hasQuotes ? ["## Quotes"] : []),
    "## Source",
  ];
  const section = bodySections(body, title, expectedHeadings, label);
  const gistLines = section("## Gist", "## Ideas");
  if (gistLines.length === 0 || gistLines.some((line) => line.trim() === "")) {
    fail(`${label} Gist`, "must contain exactly one paragraph");
  }
  if (gistLines.some((line) => /^\s*(?:[-+*]\s|\d+\.\s|>|#|```|~~~)/u.test(line))) {
    fail(`${label} Gist`, "must be a plain paragraph, not a Markdown block");
  }
  const gist = normalizedWhitespace(gistLines.join(" "));
  assertPlainText(gist, `${label} Gist`);
  const gistWords = wordCount(gist);
  if (gistWords < 35 || gistWords > 100) fail(`${label} Gist`, "must contain 35 through 100 words");

  const ideaLines = section("## Ideas", hasQuotes ? "## Quotes" : "## Source");
  if (ideaLines.length < 3 || ideaLines.length > 5 || ideaLines.some((line) => line === "")) {
    fail(`${label} Ideas`, "must contain three through five single-line bullets");
  }
  const ideas = ideaLines.map((line, index) => {
    const match = /^- \*\*([^*]+\.)\*\* (\S.*)$/u.exec(line);
    if (match?.[1] === undefined || match[2] === undefined) {
      fail(`${label} Ideas bullet ${index + 1}`, "must use `- **Short claim.** Detail`");
    }
    const claim = lineString(match[1], `${label} Ideas bullet ${index + 1} claim`, 180);
    const detail = lineString(match[2], `${label} Ideas bullet ${index + 1} detail`, 1_000);
    assertPlainText(claim, `${label} Ideas bullet ${index + 1} claim`);
    assertPlainText(detail, `${label} Ideas bullet ${index + 1} detail`);
    return { title: claim, detail };
  });

  const quotes: { text: string; attribution: string }[] = [];
  if (hasQuotes) {
    const quoteLines = section("## Quotes", "## Source");
    const groups = quoteLines.join("\n").split("\n\n").map((group) => group.split("\n"));
    if (groups.length < 1 || groups.length > MAX_QUOTES_PER_DIGEST || groups.some((group) => group.length !== 3)) {
      fail(`${label} Quotes`, `must contain one through ${MAX_QUOTES_PER_DIGEST} three-line quote groups separated by one blank line`);
    }
    for (const [index, group] of groups.entries()) {
      const quoteMatch = /^> (.+)$/u.exec(group[0] ?? "");
      const attributionMatch = /^> Attribution: (.+)$/u.exec(group[2] ?? "");
      if (quoteMatch?.[1] === undefined || group[1] !== ">" || attributionMatch?.[1] === undefined) {
        fail(`${label} Quotes item ${index + 1}`, "must contain exactly the quote, an empty `>` line, and Attribution");
      }
      const text = lineString(quoteMatch[1], `${label} Quotes item ${index + 1} text`, 500);
      const attribution = lineString(
        attributionMatch[1],
        `${label} Quotes item ${index + 1} attribution`,
        300,
      );
      assertPlainText(text, `${label} Quotes item ${index + 1} text`);
      assertPlainText(attribution, `${label} Quotes item ${index + 1} attribution`);
      if (quotePairIsSurrounded(text)) {
        fail(`${label} Quotes item ${index + 1} text`, "must not include surrounding quotation marks");
      }
      if (wordCount(text) > 25) {
        fail(`${label} Quotes item ${index + 1} text`, "must contain at most 25 words");
      }
      quotes.push({ text, attribution });
    }
    const normalizedQuotes = quotes.map(({ text }) => normalizedWhitespace(text).toLocaleLowerCase("en-US"));
    if (new Set(normalizedQuotes).size !== normalizedQuotes.length) {
      fail(`${label} Quotes`, "must not repeat quote text");
    }
    if (quotes.reduce((total, { text }) => total + wordCount(text), 0) > MAX_QUOTED_WORDS_PER_DIGEST) {
      fail(`${label} Quotes`, `must contain at most ${MAX_QUOTED_WORDS_PER_DIGEST} quoted words in total`);
    }
  }

  const sourceLines = section("## Source", undefined);
  if (sourceLines.length !== 1 || sourceLines[0] !== `[[${captureId}|captured source]]`) {
    fail(`${label} Source`, "must contain exactly the related capture link");
  }
  return { gist, ideas, quotes };
}

function richInline(node: unknown, label: string): ReadingInlineData {
  const candidate = record(node, label);
  if (candidate.type === "break") return { kind: "break" };
  if (candidate.type === "text") {
    if (typeof candidate.value !== "string" || candidate.value === "" || candidate.value.length > 8_000) {
      fail(label, "contains invalid text");
    }
    assertPublicTextSafety(candidate.value, label);
    return { kind: "text", value: candidate.value.normalize("NFC") };
  }
  if (candidate.type === "emphasis" || candidate.type === "strong") {
    const inlineKind = candidate.type;
    if (!Array.isArray(candidate.children) || candidate.children.length === 0) {
      fail(label, `${inlineKind} must contain inline text`);
    }
    return {
      kind: inlineKind,
      children: candidate.children.map((child, index) => richInline(child, `${label} ${inlineKind}[${index}]`)),
    };
  }
  fail(label, `uses unsupported inline Markdown node ${String(candidate.type)}`);
}

function plainInlineText(nodes: readonly ReadingInlineData[]): string {
  return nodes.map((node) => node.kind === "text"
    ? node.value
    : node.kind === "break"
      ? " "
      : plainInlineText(node.children)).join("");
}

function markdownPlainText(node: unknown): string {
  if (!isRecord(node)) return "";
  const type = node.type;
  if (type === "text" || type === "inlineCode" || type === "code") {
    return typeof node.value === "string" ? node.value : "";
  }
  if (type === "break") return " ";
  if (type === "html" || type === "definition" || type === "image"
    || type === "imageReference" || type === "thematicBreak") {
    return MARKDOWN_OMISSION_BARRIER;
  }
  if (!Array.isArray(node.children)) return MARKDOWN_OMISSION_BARRIER;
  const separator = type === "root" || type === "blockquote" || type === "list"
    || type === "listItem" || type === "table" || type === "tableRow"
    || type === "footnoteDefinition"
    ? " "
    : "";
  return node.children.map((child) => markdownPlainText(child)).join(separator);
}

function transcriptListPlainText(node: JsonObject): string {
  if (node.type !== "list" || !Array.isArray(node.children)) return markdownPlainText(node);
  return node.children.map((child) => {
    const text = markdownPlainText(child);
    const timestamp = /^\[(?:\d{1,2}:)?\d{2}:\d{2}\]\s*(>>)?\s*/u.exec(text);
    if (timestamp === null) return text;
    const spokenText = text.slice(timestamp[0].length);
    return timestamp[1] === undefined
      ? spokenText
      : `${MARKDOWN_OMISSION_BARRIER}${spokenText}`;
  }).join(" ");
}

function markdownQuotePlainText(root: JsonObject): string {
  if (root.type !== "root" || !Array.isArray(root.children)) return markdownPlainText(root);
  let inTranscript = false;
  return root.children.map((child) => {
    if (isRecord(child) && child.type === "heading" && typeof child.depth === "number") {
      const headingText = normalizedWhitespace(markdownPlainText(child));
      if (child.depth <= 2) inTranscript = child.depth === 2 && headingText === "Transcript";
      return markdownPlainText(child);
    }
    if (inTranscript && isRecord(child) && child.type === "list") {
      return transcriptListPlainText(child);
    }
    return markdownPlainText(child);
  }).join(" ");
}

function quoteOccurrenceRanges(haystack: string, needle: string, label: string): readonly TextRange[] {
  const ranges: TextRange[] = [];
  let searchFrom = 0;
  let occurrence = haystack.indexOf(needle, searchFrom);
  while (occurrence !== -1) {
    ranges.push({ start: occurrence, end: occurrence + needle.length });
    if (ranges.length > MAX_QUOTE_OCCURRENCES) {
      fail(label, "is too common in the capture to identify a distinctive passage");
    }
    searchFrom = occurrence + 1;
    occurrence = haystack.indexOf(needle, searchFrom);
  }
  return ranges;
}

function assignDistinctQuoteRanges(
  candidates: readonly (readonly TextRange[])[],
): readonly TextRange[] | undefined {
  const orders: number[][] = [];
  const permute = (remaining: readonly number[], prefix: readonly number[]): void => {
    if (remaining.length === 0) {
      orders.push([...prefix]);
      return;
    }
    for (const [position, index] of remaining.entries()) {
      permute(
        remaining.filter((_, candidatePosition) => candidatePosition !== position),
        [...prefix, index],
      );
    }
  };
  permute(candidates.map((_, index) => index), []);

  for (const order of orders) {
    const selected: (TextRange | undefined)[] = Array.from({ length: candidates.length });
    let after = 0;
    let valid = true;
    for (const index of order) {
      const next = candidates[index]?.find(({ start }) => start >= after);
      if (next === undefined) {
        valid = false;
        break;
      }
      selected[index] = next;
      after = next.end;
    }
    if (valid) return selected.flatMap((range) => range === undefined ? [] : [range]);
  }
  return undefined;
}

function markdownRoot(markdown: string, label: string): JsonObject {
  try {
    return record(unified().use(remarkParse).parse(markdown), label);
  } catch {
    fail(label, "is not valid Markdown");
  }
}

function withoutLeadingFrontmatter(markdown: string): string {
  if (!markdown.startsWith("---\n")) return markdown;
  const lines = markdown.split("\n");
  const end = lines.findIndex((line, index) => index > 0 && line === "---");
  return end === -1 ? "" : lines.slice(end + 1).join("\n");
}

function parseFullNoteBody(
  body: string,
  title: string,
  sourceUrl: string,
  label: string,
): ParsedFullNoteBody {
  const section = bodySections(
    body,
    title,
    [`# ${title}`, "## Note", "## Source"],
    label,
  );
  const noteLines = section("## Note", "## Source");
  if (noteLines.length === 0) fail(`${label} Note`, "must contain one reviewed block quotation");
  const root = markdownRoot(noteLines.join("\n"), `${label} Note`);
  if (!Array.isArray(root.children) || root.children.length !== 1) {
    fail(`${label} Note`, "must contain exactly one Markdown block quotation");
  }
  const blockquote = record(root.children[0], `${label} Note blockquote`);
  if (blockquote.type !== "blockquote" || !Array.isArray(blockquote.children)
    || blockquote.children.length === 0 || blockquote.children.length > 40) {
    fail(`${label} Note`, "must contain one block quotation with one through 40 paragraphs");
  }
  const paragraphs = blockquote.children.map((child, index): ReadingParagraphData => {
    const paragraph = record(child, `${label} Note paragraph ${index + 1}`);
    if (paragraph.type !== "paragraph" || !Array.isArray(paragraph.children)
      || paragraph.children.length === 0) {
      fail(`${label} Note paragraph ${index + 1}`, "must be a non-empty paragraph");
    }
    const children = paragraph.children.map((inline, inlineIndex) =>
      richInline(inline, `${label} Note paragraph ${index + 1} inline ${inlineIndex + 1}`));
    const paragraphText = plainInlineText(children);
    assertPublicTextSafety(paragraphText, `${label} Note paragraph ${index + 1}`);
    if (normalizedWhitespace(paragraphText) === "") {
      fail(`${label} Note paragraph ${index + 1}`, "must contain visible text");
    }
    return {
      kind: "paragraph",
      children,
    };
  });
  const noteWords = wordCount(paragraphs.map(({ children }) => plainInlineText(children)).join(" "));
  if (noteWords > MAX_FULL_NOTE_WORDS) {
    fail(`${label} Note`, `must contain at most ${MAX_FULL_NOTE_WORDS} words`);
  }

  const sourceLines = section("## Source", undefined);
  if (sourceLines.length === 0) fail(`${label} Source`, "must contain one linked public citation");
  const sourceRoot = markdownRoot(sourceLines.join("\n"), `${label} Source`);
  if (!Array.isArray(sourceRoot.children) || sourceRoot.children.length !== 1) {
    fail(`${label} Source`, "must contain exactly one linked public citation");
  }
  const sourceParagraph = record(sourceRoot.children[0], `${label} Source paragraph`);
  if (sourceParagraph.type !== "paragraph" || !Array.isArray(sourceParagraph.children)
    || sourceParagraph.children.length !== 1) {
    fail(`${label} Source`, "must contain exactly one linked public citation");
  }
  const sourceLink = record(sourceParagraph.children[0], `${label} Source link`);
  if (sourceLink.type !== "link" || sourceLink.title !== null
    || !Array.isArray(sourceLink.children) || sourceLink.children.length === 0) {
    fail(`${label} Source`, "must contain one Markdown link whose URL exactly matches reading.source_url");
  }
  const citedSourceUrl = httpsUrl(sourceLink.url, `${label} Source link URL`, {
    permitKnownTracking: false,
  });
  if (citedSourceUrl !== sourceUrl) {
    fail(`${label} Source`, "link URL must exactly match reading.source_url after URL normalization");
  }
  const citation = sourceLink.children.map((inline, index) =>
    richInline(inline, `${label} Source citation inline ${index + 1}`));
  const citationText = normalizedWhitespace(plainInlineText(citation));
  assertPublicTextSafety(citationText, `${label} Source citation`);
  if (citationText === "" || citationText.length > 1_000) {
    fail(`${label} Source`, "citation text must contain one through 1,000 characters");
  }
  return { paragraphs, citation };
}

function captureId(value: unknown, label: string): string {
  const id = lineString(value, label, 1_024);
  const parts = id.split("/");
  if (parts.length < 3 || parts[0] !== "articles"
    || parts.some((part) => part === "" || part === "." || part === ".." || !/^[\p{L}\p{N}._-]+$/u.test(part))
    || id.endsWith(".md")) {
    fail(label, "must be a confined `articles/...` capture note ID without `.md`");
  }
  return id.normalize("NFC");
}

function evidenceNoteId(value: unknown, label: string): string {
  const id = lineString(value, label, 1_024);
  const parts = id.split("/");
  if (parts.length < 2
    || parts.some((part) => part === "" || part === "." || part === ".." || !/^[\p{L}\p{N}._-]+$/u.test(part))
    || id.endsWith(".md")) {
    fail(label, "must be a confined KB note ID without `.md`");
  }
  return id.normalize("NFC");
}

function parseManifest(path: string, label: string): CaptureManifest | "pdf" {
  const manifest = jsonObject(path, MAX_CAPTURE_MANIFEST_BYTES, label);
  const schemaVersion = manifest.schemaVersion;
  if (!Number.isSafeInteger(schemaVersion) || (schemaVersion !== 1 && schemaVersion !== 2 && schemaVersion !== 3)) {
    fail(label, "has an unsupported schemaVersion");
  }
  if (manifest.kind === "pdf") return "pdf";
  const capturedAt = lineString(manifest.capturedAt, `${label} capturedAt`, 100);
  if (!/^\d{4}-\d{2}-\d{2}T/u.test(capturedAt) || !Number.isFinite(Date.parse(capturedAt))) {
    fail(`${label} capturedAt`, "must be an ISO-compatible timestamp");
  }
  const savedAt = validDate(capturedAt.slice(0, 10), `${label} capturedAt`);
  const status = lineString(manifest.status, `${label} status`, 80);
  const scope = lineString(manifest.scope, `${label} scope`, 80);
  const canonicalUrl = httpsUrl(manifest.canonicalUrl, `${label} canonicalUrl`, {
    permitKnownTracking: true,
  });
  const acquisition = record(manifest.acquisition, `${label} acquisition`);
  const acquisitionMethod = lineString(acquisition.method, `${label} acquisition.method`, 80);
  let warningCount = 0;
  if (manifest.warnings !== undefined) {
    if (!Array.isArray(manifest.warnings)
      || manifest.warnings.some((warning) => typeof warning !== "string")) {
      fail(`${label} warnings`, "must be an array of strings");
    }
    warningCount = manifest.warnings.length;
  }
  return {
    capturedAt,
    savedAt,
    canonicalUrl,
    status,
    scope,
    acquisitionMethod,
    warningCount,
  };
}

function optionalCaptureField(metadata: JsonObject, name: string, label: string): string | undefined {
  return optionalLineString(metadata[name], `${label} ${name}`, 500);
}

function loadCapture(
  repositoryRoot: string,
  id: string,
  noteStatus: "draft" | "published",
  partialReviewed: true | undefined,
  label: string,
): CaptureSource {
  const kbRoot = join(repositoryRoot, "kb");
  const markdownPath = resolve(kbRoot, `${id}.md`);
  confined(kbRoot, markdownPath, `${label} capture relation`);
  const source = markdownDocument(markdownPath, MAX_CAPTURE_MARKDOWN_BYTES, `${label} capture Markdown`);
  const title = lineString(source.metadata.title, `${label} capture title`, 500);
  assertPlainText(title, `${label} capture title`);
  const sourceUrl = httpsUrl(source.metadata.source, `${label} capture source`, {
    permitKnownTracking: true,
  });
  const clipped = validDate(source.metadata.clipped, `${label} capture clipped`);
  const author = optionalCaptureField(source.metadata, "author", `${label} capture`);
  const published = sourcePublishedDate(source.metadata.published, `${label} capture published`);
  const captureStatus = optionalCaptureField(source.metadata, "capture_status", `${label} capture`);
  const captureMethod = optionalCaptureField(source.metadata, "capture_method", `${label} capture`);
  const captureScope = optionalCaptureField(source.metadata, "capture_scope", `${label} capture`);
  const manifestPath = join(dirname(markdownPath), "capture.json");
  let manifest: CaptureManifest | undefined;
  if (existsSync(manifestPath)) {
    const parsed = parseManifest(manifestPath, `${label} capture manifest`);
    if (parsed === "pdf") fail(label, "must synthesize a web capture, not a PDF bundle");
    manifest = parsed;
    if (manifest.savedAt !== clipped) fail(label, "capture manifest day does not match Markdown clipped date");
    if (manifest.canonicalUrl !== sourceUrl) fail(label, "capture Markdown source does not match manifest canonicalUrl");
    if (captureStatus !== undefined && captureStatus !== manifest.status) {
      fail(label, "capture Markdown status does not match its manifest");
    }
    if (captureMethod !== undefined && captureMethod !== manifest.acquisitionMethod) {
      fail(label, "capture Markdown method does not match its manifest");
    }
    if (captureScope !== undefined && captureScope !== manifest.scope) {
      fail(label, "capture Markdown scope does not match its manifest");
    }
  } else if (noteStatus === "published") {
    fail(label, "published reading notes require an adjacent capture.json manifest");
  }
  const effectiveStatus = manifest?.status ?? captureStatus;
  if (effectiveStatus !== undefined && effectiveStatus !== "complete" && effectiveStatus !== "partial") {
    fail(label, `capture status ${effectiveStatus} is not publishable`);
  }
  if (effectiveStatus === "partial" && partialReviewed !== true) {
    fail(label, "partial captures require `partial_reviewed: true`");
  }
  if (effectiveStatus === "complete" && partialReviewed === true) {
    fail(label, "complete captures must omit `partial_reviewed`");
  }
  if (manifest !== undefined && noteStatus === "published"
    && privateAcquisitionMethods.has(manifest.acquisitionMethod)) {
    fail(label, `published reading notes cannot use private acquisition method ${manifest.acquisitionMethod}`);
  }
  return {
    id,
    title,
    sourceUrl,
    clipped,
    ...(author === undefined ? {} : { author }),
    ...(published === undefined ? {} : { published }),
    body: source.body,
    ...(manifest === undefined ? {} : { manifest }),
    ...(captureStatus === undefined ? {} : { captureStatus }),
  };
}

function readingAuthors(value: unknown, label: string): readonly ReadingAuthor[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 20) {
    fail(label, "must contain one through 20 author objects");
  }
  const authors = value.map((candidate, index): ReadingAuthor => {
    const author = record(candidate, `${label}[${index}]`);
    allowedKeys(author, new Set(["kind", "name", "url"]), `${label}[${index}]`);
    const name = lineString(author.name, `${label}[${index}].name`, 200);
    assertPlainText(name, `${label}[${index}].name`);
    const kind = author.kind;
    if (kind !== undefined && kind !== "organization" && kind !== "person") {
      fail(`${label}[${index}].kind`, "must be `organization` or `person`");
    }
    const url = author.url === undefined
      ? undefined
      : httpsUrl(author.url, `${label}[${index}].url`, { permitKnownTracking: false });
    return {
      ...(kind === undefined ? {} : { kind }),
      name,
      ...(url === undefined ? {} : { url }),
    };
  });
  const names = authors.map(({ name }) => normalizedWhitespace(name).toLocaleLowerCase("en-US"));
  if (new Set(names).size !== names.length) fail(label, "must not repeat an author name");
  return authors;
}

function sourceAuthorNames(value: string): readonly string[] {
  return value.split(/\s*;\s*/u)
    .map((name) => normalizedWhitespace(name).toLocaleLowerCase("en-US"))
    .filter((name) => name !== "")
    .toSorted();
}

function sameAuthors(captureAuthor: string, authors: readonly ReadingAuthor[]): boolean {
  const captured = sourceAuthorNames(captureAuthor);
  const reviewed = authors
    .map(({ name }) => normalizedWhitespace(name).toLocaleLowerCase("en-US"))
    .toSorted();
  return captured.length === reviewed.length && captured.every((name, index) => name === reviewed[index]);
}

function validateReadingNote(repositoryRoot: string, path: string): ValidatedReadingNote {
  const name = basename(path, ".md");
  const label = `reading note ${name}`;
  const note = markdownDocument(path, MAX_READING_NOTE_BYTES, label);
  allowedKeys(note.metadata, topLevelMetadataKeys, `${label} frontmatter`);
  const title = lineString(note.metadata.title, `${label} title`, 500);
  assertPlainText(title, `${label} title`);
  if (note.metadata.type !== "note") fail(label, "top-level type must be `note`");
  if (!Array.isArray(note.metadata.tags)
    || note.metadata.tags.some((tag) => typeof tag !== "string")
    || !note.metadata.tags.includes("reading")) {
    fail(label, "top-level tags must be an array containing `reading`");
  }
  const reading = record(note.metadata.reading, `${label} reading`);
  const status = reading.status;
  if (status !== "draft" && status !== "published") {
    fail(`${label} reading.status`, "must be `draft` or `published`");
  }
  const form = reading.form;
  if (form !== "digest" && form !== "note") {
    fail(`${label} reading.form`, "must be `digest` or `note`");
  }
  allowedKeys(
    reading,
    form === "digest" ? digestReadingMetadataKeys : fullNoteReadingMetadataKeys,
    `${label} reading`,
  );
  const slug = lineString(reading.slug, `${label} reading.slug`, 100);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug)) fail(label, "reading.slug must be kebab-case");
  if (name !== slug) fail(label, "filename must match reading.slug");
  const sourceUrl = httpsUrl(reading.source_url, `${label} reading.source_url`, {
    permitKnownTracking: false,
  });
  const reviewed = validDate(reading.reviewed, `${label} reading.reviewed`);
  const authors = readingAuthors(reading.authors, `${label} reading.authors`);
  const publication = record(reading.publication, `${label} reading.publication`);
  allowedKeys(publication, new Set(["name", "url"]), `${label} reading.publication`);
  const publicationName = lineString(publication.name, `${label} reading.publication.name`, 200);
  assertPlainText(publicationName, `${label} reading.publication.name`);
  const publicationUrl = httpsUrl(publication.url, `${label} reading.publication.url`, {
    permitKnownTracking: false,
  });
  const relations = record(note.metadata.relations, `${label} relations`);

  if (form === "digest") {
    const published = reading.published === undefined
      ? undefined
      : validDate(reading.published, `${label} reading.published`);
    const partialReviewed = booleanTrue(reading.partial_reviewed, `${label} reading.partial_reviewed`);
    const authorMetadataReviewed = booleanTrue(
      reading.author_metadata_reviewed,
      `${label} reading.author_metadata_reviewed`,
    );
    if (Object.keys(relations).length !== 1 || !Object.hasOwn(relations, "synthesizes")) {
      fail(label, "digest form must declare exactly one relation predicate: `synthesizes`");
    }
    if (!Array.isArray(relations.synthesizes) || relations.synthesizes.length !== 1) {
      fail(`${label} relations.synthesizes`, "must contain exactly one capture note ID");
    }
    const relatedCaptureId = captureId(
      relations.synthesizes[0],
      `${label} relations.synthesizes[0]`,
    );
    const body = parseDigestBody(note.body, title, relatedCaptureId, label);
    const capture = loadCapture(repositoryRoot, relatedCaptureId, status, partialReviewed, label);
    if (capture.sourceUrl !== sourceUrl) fail(label, "reading.source_url does not match the capture canonical URL");
    if (capture.author === undefined && authorMetadataReviewed !== true) {
      fail(label, "capture has no author metadata; review and set `author_metadata_reviewed: true`");
    }
    if (capture.author !== undefined && !sameAuthors(capture.author, authors)
      && authorMetadataReviewed !== true) {
      fail(label, "reading authors do not match capture author metadata; review and set `author_metadata_reviewed: true`");
    }
    if (published !== undefined && capture.published === null) {
      fail(label, "reading.published cannot supply an exact day when capture published metadata has only month precision");
    }
    if (published !== undefined && capture.published !== undefined && published !== capture.published) {
      fail(label, "reading.published does not match capture published metadata");
    }
    const normalizedCapture = normalizedWhitespace(markdownQuotePlainText(
      markdownRoot(capture.body, `${label} capture body`),
    ));
    const quoteCandidates = body.quotes.map((quote, index) => {
      const candidates = quoteOccurrenceRanges(
        normalizedCapture,
        normalizedWhitespace(quote.text),
        `${label} Quotes item ${index + 1} text`,
      );
      if (candidates.length === 0) {
        fail(label, `quote ${index + 1} does not occur verbatim in the capture body after whitespace normalization`);
      }
      return candidates;
    });
    if (assignDistinctQuoteRanges(quoteCandidates) === undefined) {
      fail(label, "quotes must cite distinct, non-overlapping passages in the capture body");
    }
    if (status === "draft") {
      return {
        slug,
        sourceUrl,
        provenanceId: relatedCaptureId,
        captureId: relatedCaptureId,
        status,
      };
    }
    if (capture.manifest === undefined) fail(label, "published note unexpectedly has no manifest");
    const entry: ReadingEntryData = {
      slug,
      title,
      reviewedAt: reviewed,
      source: {
        kind: "article",
        title: capture.title,
        url: sourceUrl,
        authors,
        publication: { name: publicationName, url: publicationUrl },
        ...(published === undefined ? {} : { publishedAt: published }),
      },
      savedAt: capture.manifest.savedAt,
      content: {
        kind: "digest",
        gist: body.gist,
        ideas: body.ideas,
        quotes: body.quotes,
      },
    };
    return {
      slug,
      sourceUrl,
      provenanceId: relatedCaptureId,
      captureId: relatedCaptureId,
      status,
      entry,
    };
  }

  const sourceKind = reading.source_kind;
  if (sourceKind !== "article" && sourceKind !== "book") {
    fail(`${label} reading.source_kind`, "must be `article` or `book`");
  }
  const sourceTitle = lineString(reading.source_title, `${label} reading.source_title`, 500);
  assertPlainText(sourceTitle, `${label} reading.source_title`);
  const saved = validReadingDate(reading.saved, `${label} reading.saved`);
  const savedAfterReview = saved.length === 10
    ? saved > reviewed
    : saved > reviewed.slice(0, 7);
  if (savedAfterReview) {
    fail(label, "reading.saved must not be later than reading.reviewed");
  }
  const summary = lineString(reading.summary, `${label} reading.summary`, 500);
  assertPlainText(summary, `${label} reading.summary`);
  const fullTextReviewed = booleanTrue(reading.full_text_reviewed, `${label} reading.full_text_reviewed`);
  if (status === "published" && fullTextReviewed !== true) {
    fail(label, "published note form requires `full_text_reviewed: true`");
  }
  const published = reading.published === undefined
    ? undefined
    : validSourcePublicationDate(reading.published, `${label} reading.published`);
  const evidenceLocator = lineString(
    reading.evidence_locator,
    `${label} reading.evidence_locator`,
    500,
  );
  assertPlainText(evidenceLocator, `${label} reading.evidence_locator`);
  const evidenceTextReviewed = booleanTrue(
    reading.evidence_text_reviewed,
    `${label} reading.evidence_text_reviewed`,
  );
  const republicationBasis = reading.republication_basis === undefined
    ? undefined
    : lineString(reading.republication_basis, `${label} reading.republication_basis`, 80);
  if (republicationBasis !== undefined && !republicationBases.has(republicationBasis)) {
    fail(
      `${label} reading.republication_basis`,
      `must be one of: ${[...republicationBases].toSorted().join(", ")}`,
    );
  }
  if (status === "published" && republicationBasis === undefined) {
    fail(label, "published note form requires a reviewed `republication_basis`");
  }
  if (Object.keys(relations).length !== 1 || !Object.hasOwn(relations, "evidenced-by")) {
    fail(label, "note form must declare exactly one relation predicate: `evidenced-by`");
  }
  const evidence = relations["evidenced-by"];
  if (!Array.isArray(evidence) || evidence.length !== 1) {
    fail(`${label} relations.evidenced-by`, "must contain exactly one evidence note ID");
  }
  const evidenceId = evidenceNoteId(evidence[0], `${label} relations.evidenced-by[0]`);
  if (evidenceId.toLocaleLowerCase("en-US").startsWith("notes/reading/")) {
    fail(label, "note-form evidence must be an original KB note outside `notes/reading`");
  }
  const kbRoot = join(repositoryRoot, "kb");
  const evidencePath = resolve(kbRoot, `${evidenceId}.md`);
  confined(kbRoot, evidencePath, `${label} evidence relation`);
  const realEvidencePath = existingRealFileWithin(kbRoot, evidencePath, `${label} evidence note`);
  let realReadingNotesRoot: string;
  try {
    realReadingNotesRoot = realpathSync(join(kbRoot, "notes/reading"));
  } catch {
    fail(label, "reading notes directory cannot be resolved");
  }
  const evidenceWithinReading = relative(realReadingNotesRoot, realEvidencePath);
  if (evidenceWithinReading === "" || (!isAbsolute(evidenceWithinReading)
    && evidenceWithinReading !== ".." && !evidenceWithinReading.startsWith(`..${sep}`))) {
    fail(label, "note-form evidence must be an original KB note outside `notes/reading`");
  }
  let realKbRoot: string;
  try {
    realKbRoot = realpathSync(kbRoot);
  } catch {
    fail(label, "KB root cannot be resolved");
  }
  const canonicalEvidencePath = relative(realKbRoot, realEvidencePath).split(sep).join("/");
  if (!canonicalEvidencePath.endsWith(".md")) {
    fail(label, "evidence must resolve to a Markdown note");
  }
  const canonicalEvidenceId = canonicalEvidencePath.slice(0, -3);
  const evidenceSource = readBoundedFile(
    realEvidencePath,
    MAX_CAPTURE_MARKDOWN_BYTES,
    `${label} evidence note`,
  );
  const body = parseFullNoteBody(note.body, title, sourceUrl, label);
  const publicText = normalizedWhitespace(
    body.paragraphs.map(({ children }) => plainInlineText(children)).join(" "),
  );
  const evidenceText = normalizedWhitespace(markdownPlainText(
    markdownRoot(withoutLeadingFrontmatter(evidenceSource), `${label} evidence note`),
  ));
  const evidenceContainsPublicText = evidenceText.includes(publicText);
  if (!evidenceContainsPublicText && evidenceTextReviewed !== true) {
    fail(
      label,
      "note text does not occur in the evidence note; manually verify the locator and set `evidence_text_reviewed: true`",
    );
  }
  if (evidenceContainsPublicText && evidenceTextReviewed === true) {
    fail(label, "note text occurs in the evidence note; omit unnecessary `evidence_text_reviewed`");
  }
  if (republicationBasis === "short-quotation" && wordCount(publicText) > 25) {
    fail(label, "`short-quotation` republication basis requires a note of at most 25 words");
  }
  if (status === "draft") {
    return { slug, sourceUrl, provenanceId: canonicalEvidenceId, status };
  }
  const entry: ReadingEntryData = {
    slug,
    title,
    reviewedAt: reviewed,
    source: {
      kind: sourceKind,
      title: sourceTitle,
      url: sourceUrl,
      authors,
      publication: { name: publicationName, url: publicationUrl },
      ...(published === undefined ? {} : { publishedAt: published }),
    },
    savedAt: saved,
    content: {
      kind: "note",
      summary,
      paragraphs: body.paragraphs,
      citation: body.citation,
    },
  };
  return { slug, sourceUrl, provenanceId: canonicalEvidenceId, status, entry };
}

function readingNotePaths(repositoryRoot: string): readonly string[] {
  const directory = join(repositoryRoot, "kb/notes/reading");
  if (!existsSync(directory)) return [];
  const stats = lstatSync(directory);
  if (!stats.isDirectory() || stats.isSymbolicLink()) fail("reading notes", "directory must be a non-symlink directory");
  const entries = readdirSync(directory, { withFileTypes: true }).toSorted((left, right) =>
    left.name.localeCompare(right.name));
  if (entries.length > MAX_READING_NOTES + 1) fail("reading notes", `exceed the ${MAX_READING_NOTES}-entry limit`);
  const paths: string[] = [];
  for (const entry of entries) {
    if (entry.isSymbolicLink()) fail(`reading notes/${entry.name}`, "must not be a symlink");
    if (entry.isDirectory()) fail(`reading notes/${entry.name}`, "nested directories are not supported");
    if (!entry.isFile() || !entry.name.endsWith(".md") || entry.name === "AGENTS.md") continue;
    paths.push(join(directory, entry.name));
  }
  if (paths.length > MAX_READING_NOTES) fail("reading notes", `exceed the ${MAX_READING_NOTES}-note limit`);
  return paths;
}

function validatedReadingNotes(repositoryRoot: string): readonly ValidatedReadingNote[] {
  const notes = readingNotePaths(repositoryRoot).map((path) => validateReadingNote(repositoryRoot, path));
  const duplicate = (field: "slug" | "sourceUrl" | "provenanceId", description: string): void => {
    const seen = new Set<string>();
    for (const note of notes) {
      const value = note[field];
      if (seen.has(value)) fail("reading notes", `contain duplicate ${description}: ${value}`);
      seen.add(value);
    }
  };
  duplicate("slug", "slug");
  duplicate("sourceUrl", "source URL");
  duplicate("provenanceId", "provenance relation");
  return notes;
}

export function readingEntries(repositoryRoot = DEFAULT_REPOSITORY_ROOT): readonly ReadingEntryData[] {
  return validatedReadingNotes(resolve(repositoryRoot))
    .flatMap((note) => note.entry === undefined ? [] : [note.entry])
    .toSorted((left, right) => right.savedAt.localeCompare(left.savedAt) || left.slug.localeCompare(right.slug));
}

export function renderReadingEntries(entries: readonly ReadingEntryData[]): string {
  return [
    'import type { ReadingEntry } from "./entries";',
    "",
    `export const generatedReadingEntries = ${JSON.stringify(entries, null, 2)} satisfies readonly ReadingEntry[];`,
    "",
  ].join("\n");
}

export function expectedReadingModule(repositoryRoot = DEFAULT_REPOSITORY_ROOT): string {
  return renderReadingEntries(readingEntries(repositoryRoot));
}

function manifestBackedInboxCapture(repositoryRoot: string, bundleName: string): ReadingInboxItem | "pdf" {
  const bundle = join(repositoryRoot, "kb/articles", bundleName);
  const manifestPath = join(bundle, "capture.json");
  const parsed = parseManifest(manifestPath, `capture ${bundleName} manifest`);
  if (parsed === "pdf") return "pdf";
  const markdownPath = join(bundle, `${bundleName}.md`);
  const markdown = markdownDocument(
    markdownPath,
    MAX_CAPTURE_MARKDOWN_BYTES,
    `capture ${bundleName} Markdown`,
  );
  const clipped = validDate(markdown.metadata.clipped, `capture ${bundleName} clipped`);
  if (clipped !== parsed.savedAt) fail(`capture ${bundleName}`, "manifest day does not match Markdown clipped date");
  const markdownUrl = httpsUrl(markdown.metadata.source, `capture ${bundleName} source`, {
    permitKnownTracking: true,
  });
  if (markdownUrl !== parsed.canonicalUrl) fail(`capture ${bundleName}`, "source does not match manifest canonicalUrl");
  const title = lineString(markdown.metadata.title, `capture ${bundleName} title`, 500);
  const author = optionalCaptureField(markdown.metadata, "author", `capture ${bundleName}`);
  const id = `articles/${bundleName}/${bundleName}`;
  const isPrivate = privateAcquisitionMethods.has(parsed.acquisitionMethod);
  const eligibleByDefault = parsed.status === "complete" && !isPrivate;
  const reason: ReadingInboxItem["reason"] = isPrivate
    ? "private-acquisition"
    : parsed.status === "partial"
      ? "partial-capture"
      : parsed.status !== "complete"
        ? "capture-not-publishable"
        : "no-reading-note";
  return {
    id,
    title,
    sourceUrl: parsed.canonicalUrl,
    savedAt: parsed.savedAt,
    ...(author === undefined ? {} : { author }),
    status: parsed.status,
    scope: parsed.scope,
    acquisitionMethod: parsed.acquisitionMethod,
    warningCount: parsed.warningCount,
    eligibleByDefault,
    reason,
  };
}

export function readingInbox(repositoryRoot = DEFAULT_REPOSITORY_ROOT): ReadingInboxReport {
  const root = resolve(repositoryRoot);
  const related = new Set(validatedReadingNotes(root).flatMap(({ captureId, provenanceId }) => [
    ...(captureId === undefined ? [] : [captureId]),
    ...(provenanceId.startsWith("articles/") ? [provenanceId] : []),
  ]));
  const articles = join(root, "kb/articles");
  if (!existsSync(articles)) {
    return { advisory: true, totalWebCaptures: 0, relatedCaptures: 0, pendingCaptures: 0, items: [] };
  }
  const stats = lstatSync(articles);
  if (!stats.isDirectory() || stats.isSymbolicLink()) fail("capture inbox", "articles must be a non-symlink directory");
  const bundles = readdirSync(articles, { withFileTypes: true }).toSorted((left, right) =>
    left.name.localeCompare(right.name));
  if (bundles.length > MAX_INBOX_CAPTURES) fail("capture inbox", `exceeds the ${MAX_INBOX_CAPTURES}-bundle limit`);
  const webCaptures: ReadingInboxItem[] = [];
  for (const bundle of bundles) {
    if (bundle.isSymbolicLink()) fail(`capture inbox/${bundle.name}`, "must not be a symlink");
    if (!bundle.isDirectory() || !existsSync(join(articles, bundle.name, "capture.json"))) continue;
    const candidate = manifestBackedInboxCapture(root, bundle.name);
    if (candidate !== "pdf") webCaptures.push(candidate);
  }
  const items = webCaptures
    .filter(({ id }) => !related.has(id))
    .toSorted((left, right) => right.savedAt.localeCompare(left.savedAt) || left.id.localeCompare(right.id));
  const relatedCaptures = webCaptures.length - items.length;
  return {
    advisory: true,
    totalWebCaptures: webCaptures.length,
    relatedCaptures,
    pendingCaptures: items.length,
    items,
  };
}

export type SyncReadingResult = {
  readonly path: string;
  readonly status: "written" | "unchanged";
  readonly entries: number;
};

function existingGenerated(path: string): string | undefined {
  if (!existsSync(path)) return undefined;
  return readBoundedFile(path, MAX_GENERATED_BYTES, "generated reading module");
}

export function syncReading(options: {
  readonly repositoryRoot?: string;
  readonly check?: boolean;
} = {}): SyncReadingResult {
  const root = resolve(options.repositoryRoot ?? DEFAULT_REPOSITORY_ROOT);
  const entries = readingEntries(root);
  const expected = renderReadingEntries(entries);
  const output = generatedReadingPath(root);
  const current = existingGenerated(output);
  if (options.check === true) {
    if (current !== expected) {
      fail("generated reading module", "is stale; run `bun run reading:generate`");
    }
    return { path: output, status: "unchanged", entries: entries.length };
  }
  if (current === expected) return { path: output, status: "unchanged", entries: entries.length };
  const outputDirectory = dirname(output);
  mkdirSync(outputDirectory, { recursive: true, mode: 0o755 });
  if (existsSync(output)) {
    const stats = lstatSync(output);
    if (!stats.isFile() || stats.isSymbolicLink()) fail("generated reading module", "must be a regular non-symlink file");
  }
  const stagingDirectory = mkdtempSync(join(outputDirectory, ".reading-sync-"));
  const staged = join(stagingDirectory, basename(output));
  try {
    writeFileSync(staged, expected, { encoding: "utf8", flag: "wx", mode: 0o644 });
    renameSync(staged, output);
  } finally {
    rmSync(stagingDirectory, { recursive: true, force: true });
  }
  return { path: output, status: "written", entries: entries.length };
}
