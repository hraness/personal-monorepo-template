import type { SocialIconName } from "@hraness/ui";

export interface PersonalProject {
  readonly description: string;
  readonly href: string;
  readonly id: string;
  readonly label: string;
}

export interface LibraryLink {
  readonly href: "/bookshelf" | "/reading";
  readonly id: "bookshelf" | "reading";
  readonly label: string;
}

export interface SocialLink {
  readonly href: string;
  readonly id: SocialIconName;
  readonly label: string;
}

export interface PersonalSiteContent {
  readonly about: string;
  readonly introduction: string;
  readonly libraryLinks: readonly LibraryLink[];
  readonly name: string;
  readonly projects: readonly PersonalProject[];
  readonly socialLinks: readonly SocialLink[];
}

/** Replace this example content before publishing the template. */
export const personalSite = Object.freeze({
  name: "your name",
  introduction: "designer, developer, and maker of small useful things.",
  libraryLinks: Object.freeze([
    Object.freeze({ id: "reading", label: "reading", href: "/reading" }),
    Object.freeze({ id: "bookshelf", label: "bookshelf", href: "/bookshelf" }),
  ]),
  projects: Object.freeze([
    Object.freeze({
      id: "field-notes",
      label: "field notes",
      description: "short observations about software, tools, and the work around them",
      href: "https://example.com/notes",
    }),
    Object.freeze({
      id: "small-tool",
      label: "small tool",
      description: "a focused utility that does one job clearly",
      href: "https://example.com/tool",
    }),
    Object.freeze({
      id: "open-source",
      label: "open source",
      description: "public experiments and reusable components",
      href: "https://github.com/example",
    }),
  ]),
  socialLinks: Object.freeze([
    Object.freeze({
      id: "github",
      label: "github",
      href: "https://github.com/example",
    }),
    Object.freeze({
      id: "linkedin",
      label: "linkedin",
      href: "https://www.linkedin.com/in/example",
    }),
    Object.freeze({
      id: "bluesky",
      label: "bluesky",
      href: "https://bsky.app/profile/example.com",
    }),
  ]),
  about:
    "I care about calm interfaces, durable knowledge, and software that leaves people with more agency. This starter keeps the surface intentionally small so it can grow around your actual work.",
}) satisfies PersonalSiteContent;
