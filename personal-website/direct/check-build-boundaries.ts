import { readFile, readdir } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

export const PRODUCTION_FORBIDDEN_MARKERS = Object.freeze([
  "@hraness/direct",
  "direct.browser-bridge/v",
  "direct.coverage/v",
  "direct.fixture/v",
  "direct.session-manifest/v",
  "direct.probe/v",
  "__direct",
  "__direct_scenario",
  "__direct_fixture",
  "Direct blocked an unmapped network request.",
  "Personal website Direct",
  "personal-website/deterministic-appearance-port/v1",
]);

export const DIRECT_FORBIDDEN_MARKERS = Object.freeze([
  "personal-website/browser-appearance-port/v1",
]);

export const SHARED_PRODUCT_MARKER = "personal-homepage/v1";
export const DIRECT_REQUIRED_MARKERS = Object.freeze([
  SHARED_PRODUCT_MARKER,
  "direct.browser-bridge/v2",
  "direct.session-manifest/v1",
  "Direct blocked an unmapped network request.",
  "personal-website/deterministic-appearance-port/v1",
]);

async function* walk(directory: string): AsyncGenerator<string> {
  const entries = (await readdir(directory, { withFileTypes: true }))
    .sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (entry.isFile()) yield path;
  }
}

function executable(file: string): boolean {
  return [".js", ".mjs", ".cjs"].includes(extname(file));
}

export interface BuildBoundaryResult {
  readonly executableFiles: readonly string[];
  readonly observedRequiredMarkers: readonly string[];
}

export async function checkBuildBoundary(
  mode: "direct" | "production",
  directory: string,
): Promise<BuildBoundaryResult> {
  const files: string[] = [];
  for await (const file of walk(directory)) {
    if (executable(file)) files.push(file);
  }
  if (files.length === 0) throw new Error(`${mode} boundary found no emitted JavaScript.`);

  const required = mode === "direct"
    ? DIRECT_REQUIRED_MARKERS
    : [SHARED_PRODUCT_MARKER, "personal-website/browser-appearance-port/v1"];
  const observed = new Set<string>();
  const violations: string[] = [];
  for (const file of files) {
    const contents = await readFile(file, "utf8");
    for (const marker of required) {
      if (contents.includes(marker)) observed.add(marker);
    }
    const forbidden = mode === "production"
      ? PRODUCTION_FORBIDDEN_MARKERS
      : DIRECT_FORBIDDEN_MARKERS;
    for (const marker of forbidden) {
      if (contents.includes(marker)) violations.push(`${file}: ${marker}`);
    }
  }
  if (violations.length > 0) {
    throw new Error(`${mode} output contains forbidden markers:\n${violations.join("\n")}`);
  }
  const missing = required.filter((marker) => !observed.has(marker));
  if (missing.length > 0) {
    throw new Error(`${mode} output is missing positive markers: ${missing.join(", ")}`);
  }
  return Object.freeze({
    executableFiles: Object.freeze(files),
    observedRequiredMarkers: Object.freeze([...observed]),
  });
}

if (import.meta.main) {
  const mode = process.argv[2];
  const rawDirectory = process.argv[3];
  if ((mode !== "direct" && mode !== "production") || rawDirectory === undefined) {
    throw new Error("Usage: check-build-boundaries.ts <production|direct> <output-directory>");
  }
  const result = await checkBuildBoundary(mode, resolve(process.cwd(), rawDirectory));
  console.log(
    `${mode} boundary scanned ${String(result.executableFiles.length)} executable files and observed ${result.observedRequiredMarkers.join(", ")}.`,
  );
}
