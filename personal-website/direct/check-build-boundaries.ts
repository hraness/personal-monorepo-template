import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";

export const PRODUCTION_FORBIDDEN_MARKERS = Object.freeze([
  "@antithesishq/bombadil",
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

export interface ProductionSourceBoundaryResult {
  readonly scannedFiles: readonly string[];
}

export interface ProductionBoundaryResult {
  readonly output: BuildBoundaryResult;
  readonly source: ProductionSourceBoundaryResult;
}

const PRODUCTION_SOURCE_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".mts",
  ".ts",
  ".tsx",
]);
const PRODUCTION_ROOT_ENTRIES = Object.freeze([
  "instrumentation-client.ts",
  "instrumentation.ts",
  "middleware.js",
  "middleware.ts",
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
  "proxy.js",
  "proxy.ts",
]);

function isTestSource(file: string): boolean {
  const name = basename(file);
  return name.includes(".test.")
    || name.includes(".spec.")
    || file.split(/[\\/]/u).includes("__tests__");
}

async function productionSourceFiles(productRoot: string): Promise<readonly string[]> {
  const files: string[] = [];
  for (const rootName of ["app", "src"] as const) {
    const root = join(productRoot, rootName);
    if (!existsSync(root)) continue;
    for await (const file of walk(root)) {
      if (PRODUCTION_SOURCE_EXTENSIONS.has(extname(file)) && !isTestSource(file)) {
        files.push(file);
      }
    }
  }
  for (const entry of PRODUCTION_ROOT_ENTRIES) {
    const file = join(productRoot, entry);
    if (existsSync(file)) files.push(file);
  }
  return Object.freeze(files.sort());
}

export async function checkProductionSourceBoundary(
  productRoot: string,
): Promise<ProductionSourceBoundaryResult> {
  const scannedFiles = await productionSourceFiles(productRoot);
  if (scannedFiles.length === 0) {
    throw new Error("production boundary found no production source files.");
  }
  const violations: string[] = [];
  for (const file of scannedFiles) {
    const contents = await readFile(file, "utf8");
    for (const marker of PRODUCTION_FORBIDDEN_MARKERS) {
      if (contents.includes(marker)) violations.push(`${file}: ${marker}`);
    }
  }
  if (violations.length > 0) {
    throw new Error(`production source contains forbidden markers:\n${violations.join("\n")}`);
  }
  return Object.freeze({ scannedFiles });
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

export async function checkProductionBoundary(
  productRoot: string,
  outputDirectory: string,
): Promise<ProductionBoundaryResult> {
  const source = await checkProductionSourceBoundary(productRoot);
  const output = await checkBuildBoundary("production", outputDirectory);
  return Object.freeze({ output, source });
}

if (import.meta.main) {
  const mode = process.argv[2];
  const rawDirectory = process.argv[3];
  if ((mode !== "direct" && mode !== "production") || rawDirectory === undefined) {
    throw new Error("Usage: check-build-boundaries.ts <production|direct> <output-directory>");
  }
  const directory = resolve(process.cwd(), rawDirectory);
  if (mode === "production") {
    const result = await checkProductionBoundary(resolve(import.meta.dir, ".."), directory);
    console.log(
      `production boundary scanned ${String(result.source.scannedFiles.length)} source files and ${String(result.output.executableFiles.length)} executable files and observed ${result.output.observedRequiredMarkers.join(", ")}.`,
    );
  } else {
    const result = await checkBuildBoundary(mode, directory);
    console.log(
      `${mode} boundary scanned ${String(result.executableFiles.length)} executable files and observed ${result.observedRequiredMarkers.join(", ")}.`,
    );
  }
}
