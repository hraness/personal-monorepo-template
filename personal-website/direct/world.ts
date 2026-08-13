import type { JsonValue } from "@hraness/direct";
import {
  isSocialIconName,
  type SocialIconName,
} from "@hraness/ui";

import {
  isAppearancePreference,
  type AppearancePreference,
  type ResolvedAppearance,
} from "../src/appearance-port";

export type WebsiteDirectProject = {
  readonly [key: string]: JsonValue;
  readonly description: string;
  readonly href: string;
  readonly id: string;
  readonly label: string;
};

export type WebsiteDirectSocialLink = {
  readonly [key: string]: JsonValue;
  readonly href: string;
  readonly id: SocialIconName;
  readonly label: string;
};

export type WebsiteDirectContent = {
  readonly [key: string]: JsonValue;
  readonly about: string;
  readonly introduction: string;
  readonly name: string;
  readonly projects: readonly WebsiteDirectProject[];
  readonly socialLinks: readonly WebsiteDirectSocialLink[];
};

export type WebsiteDirectAppearance = {
  readonly [key: string]: JsonValue;
  readonly preference: AppearancePreference;
  readonly resolved: ResolvedAppearance;
  readonly writeFailure: string | null;
};

export type WebsiteDirectWorld = {
  readonly [key: string]: JsonValue;
  readonly appearance: WebsiteDirectAppearance;
  readonly content: WebsiteDirectContent;
  readonly version: 1;
};

const WORLD_KEYS = new Set(["version", "appearance", "content"]);
const APPEARANCE_KEYS = new Set(["preference", "resolved", "writeFailure"]);
const CONTENT_KEYS = new Set(["name", "introduction", "projects", "socialLinks", "about"]);
const PROJECT_KEYS = new Set(["id", "label", "description", "href"]);
const SOCIAL_KEYS = new Set(["id", "label", "href"]);
const IDENTIFIER = /^[a-z][a-z0-9-]{0,47}$/u;

function exactRecord(
  input: unknown,
  allowedKeys: ReadonlySet<string>,
  label: string,
): Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new Error(`${label} must be a plain object.`);
  }
  const prototype: unknown = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error(`${label} must have a JSON object prototype.`);
  }
  const record: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== "string" || !allowedKeys.has(key)) {
      throw new Error(`${label} has an unknown key: ${String(key)}`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable) {
      throw new Error(`${label}.${key} must be an enumerable data property.`);
    }
    record[key] = descriptor.value;
  }
  return record;
}

function text(input: unknown, label: string, maximum: number): string {
  if (
    typeof input !== "string"
    || input.trim().length === 0
    || input.length > maximum
    || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(input)
  ) {
    throw new Error(`${label} must contain 1-${String(maximum)} visible characters.`);
  }
  return input;
}

function identifier(input: unknown, label: string): string {
  if (typeof input !== "string" || !IDENTIFIER.test(input)) {
    throw new Error(`${label} must be a lowercase identifier.`);
  }
  return input;
}

function webUrl(input: unknown, label: string): string {
  const value = text(input, label, 512);
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} must be an absolute HTTP or HTTPS URL.`);
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`${label} must be an absolute HTTP or HTTPS URL.`);
  }
  if (parsed.username !== "" || parsed.password !== "") {
    throw new Error(`${label} must not contain URL credentials.`);
  }
  return parsed.href;
}

function parseProject(input: unknown, index: number): WebsiteDirectProject {
  const record = exactRecord(input, PROJECT_KEYS, `content.projects[${String(index)}]`);
  return Object.freeze({
    id: identifier(record.id, `content.projects[${String(index)}].id`),
    label: text(record.label, `content.projects[${String(index)}].label`, 80),
    description: text(
      record.description,
      `content.projects[${String(index)}].description`,
      320,
    ),
    href: webUrl(record.href, `content.projects[${String(index)}].href`),
  });
}

function parseSocialLink(input: unknown, index: number): WebsiteDirectSocialLink {
  const record = exactRecord(input, SOCIAL_KEYS, `content.socialLinks[${String(index)}]`);
  if (!isSocialIconName(record.id)) {
    throw new Error(
      `content.socialLinks[${String(index)}].id must name a supported social icon.`,
    );
  }
  return Object.freeze({
    id: record.id,
    label: text(record.label, `content.socialLinks[${String(index)}].label`, 80),
    href: webUrl(record.href, `content.socialLinks[${String(index)}].href`),
  });
}

function uniqueIds(
  values: readonly { readonly id: string }[],
  label: string,
): void {
  const ids = new Set<string>();
  for (const value of values) {
    if (ids.has(value.id)) throw new Error(`${label} repeats ID: ${value.id}`);
    ids.add(value.id);
  }
}

function parseContent(input: unknown): WebsiteDirectContent {
  const record = exactRecord(input, CONTENT_KEYS, "content");
  if (!Array.isArray(record.projects) || record.projects.length > 12) {
    throw new Error("content.projects must contain at most 12 projects.");
  }
  if (!Array.isArray(record.socialLinks) || record.socialLinks.length > 12) {
    throw new Error("content.socialLinks must contain at most 12 links.");
  }
  const projects = record.projects.map(parseProject);
  const socialLinks = record.socialLinks.map(parseSocialLink);
  uniqueIds(projects, "content.projects");
  uniqueIds(socialLinks, "content.socialLinks");
  return Object.freeze({
    name: text(record.name, "content.name", 100),
    introduction: text(record.introduction, "content.introduction", 320),
    projects: Object.freeze(projects),
    socialLinks: Object.freeze(socialLinks),
    about: text(record.about, "content.about", 2_000),
  });
}

function parseAppearance(input: unknown): WebsiteDirectAppearance {
  const record = exactRecord(input, APPEARANCE_KEYS, "appearance");
  if (!isAppearancePreference(record.preference)) {
    throw new Error("appearance.preference must be light, dark, or system.");
  }
  if (record.resolved !== "light" && record.resolved !== "dark") {
    throw new Error("appearance.resolved must be light or dark.");
  }
  if (record.preference !== "system" && record.resolved !== record.preference) {
    throw new Error("appearance.resolved must equal a concrete preference.");
  }
  let writeFailure: string | null;
  if (record.writeFailure === null) writeFailure = null;
  else writeFailure = text(record.writeFailure, "appearance.writeFailure", 240);
  return Object.freeze({
    preference: record.preference,
    resolved: record.resolved,
    writeFailure,
  });
}

export function parseWebsiteDirectWorld(input: unknown): WebsiteDirectWorld {
  const record = exactRecord(input, WORLD_KEYS, "Personal website Direct world");
  if (record.version !== 1) {
    throw new Error("Personal website Direct world version must be 1.");
  }
  return Object.freeze({
    version: 1,
    appearance: parseAppearance(record.appearance),
    content: parseContent(record.content),
  });
}

export function createWebsiteDirectWorld(
  input: Omit<WebsiteDirectWorld, "version">,
): WebsiteDirectWorld {
  return parseWebsiteDirectWorld({ version: 1, ...input });
}
