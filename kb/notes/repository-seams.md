---
title: Repository seams
type: concept
tags:
  - architecture
  - dependencies
  - repositories
repository_scopes:
  - AGENTS.md
  - package.json
  - personal-website/package.json
---

# Repository seams

The personal monorepo template is the portable reference for a personal site,
an authored Markdown KB, deterministic Direct development, and reusable agent
skills. It distributes conventions and frozen interfaces. It does not require
repositories created from the template to remain synchronized with its
`main` branch.

The root pins `@hraness/kb` to an immutable release. The website pins
`@hraness/ui` and the development-only `@hraness/direct` boundary to immutable
releases. Keep those artifact boundaries instead of sibling paths, Git
submodules, or coordinated `main` workflows. Each consumer upgrades when it
can validate the new interface locally.

Use `@hraness/ui` for stable, portable primitives and tokens. Keep page
composition, copy, application state, and the local `/design` contract owned by
the product. Extract another shared package only after two concrete consumers
need the same stable, product-neutral interface.

Freeze shared interfaces before parallel implementation. Give workspace
manifests, lockfiles, generated registries, and other convergence files one
owner while independent lanes work in disjoint paths.

## Related

The normative rules remain in the root `AGENTS.md`.
[[documentation-ownership|Documentation ownership]] explains how those rules
relate to executable contracts and this pull-based context.
