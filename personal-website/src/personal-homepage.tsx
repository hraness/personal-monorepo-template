"use client";

import {
  Badge,
  QuietSiteFooter,
  QuietSitePage,
  SocialIcon,
} from "@hraness/ui";
import { useSyncExternalStore } from "react";

import type { AppearancePort } from "./appearance-port";
import { AppearanceSwitcher } from "./appearance-switcher";
import type { PersonalSiteContent } from "./site";

export const PERSONAL_HOMEPAGE_MARKER = "personal-homepage/v1";

export function PersonalHomepage({
  appearance,
  content,
}: Readonly<{
  appearance: AppearancePort;
  content: PersonalSiteContent;
}>) {
  const snapshot = useSyncExternalStore(
    appearance.subscribe,
    appearance.getSnapshot,
    appearance.getSnapshot,
  );

  return (
    <div
      className="personal-surface"
      data-product-surface={PERSONAL_HOMEPAGE_MARKER}
      data-theme={snapshot.resolved}
    >
      <QuietSitePage className="personal-index">
        <header>
          <h1>{content.name}</h1>
          <p>{content.introduction}</p>
        </header>

        <section aria-labelledby="projects-heading">
          <h2 id="projects-heading">projects</h2>
          <ul className="project-list">
            {content.projects.map((project) => (
              <li key={project.id}>
                <a href={project.href}>
                  <Badge>{project.label}</Badge>
                </a>
                <span aria-hidden="true"> · </span>
                <span>{project.description}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="elsewhere-heading">
          <h2 id="elsewhere-heading">elsewhere</h2>
          <ul className="social-list">
            {content.socialLinks.map((link) => (
              <li key={link.id}>
                <a href={link.href} rel="me">
                  <SocialIcon name={link.id} />
                  <span>{link.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="about-heading">
          <h2 id="about-heading">about me</h2>
          <p>{content.about}</p>
        </section>
      </QuietSitePage>

      <QuietSiteFooter className="personal-footer">
        <AppearanceSwitcher port={appearance} />
      </QuietSiteFooter>
    </div>
  );
}
