---
title: Repository agent context
type: agent-context
scope: .
tags:
  - agents
  - architecture
  - context-engineering
---

# Repository agent context

The root `AGENTS.md` is the repository's normative control plane. Its compact rules apply before deeper lookup. This hub explains why those boundaries exist and routes an agent to current procedures and related knowledge without placing the complete repository model in every task's initial context.

## Four places hold four kinds of truth

`AGENTS.md` owns instructions an agent must know before editing: ownership, hard prohibitions, dependency boundaries, and required verification. Repository `docs/` owns current multi-step operating procedures. Types, tests, schemas, and deterministic checkers own executable contracts. The KB owns pull-based rationale, history, evidence, maintained synthesis, plans, and relationships.

That split is maintained in [[notes/documentation-ownership|documentation ownership]]. `kb context` resolves inherited guides, this curated hub, and current records whose exact `repository_scopes` match a requested path. Guides remain authoritative: this hub can explain a rule, but it cannot override or become the only home of a load-bearing constraint.

## Correctness is cheaper before production

Agent work makes coherent cross-file changes, adversarial examples, and property checks comparatively cheap. Production exposure, provider coordination, rollout, and observation remain expensive. Prefer a robust, explicit model and deterministic evidence before handoff. Put future work with a verification method in a durable plan instead of an unowned reminder.

Keep invalid states out of the model when possible. Parse foreign values from `unknown`, preserve boundaries around development-only tooling, and use property tests for laws and round trips. The full repository gate proves the production and Direct build boundaries independently.

## Writing and planning stay durable

`WRITING.md` and `STYLE.md` are current editing contracts and stay outside the KB so they apply before retrieval. KB plans retain decisions, deviations, review findings, and reproducible verification evidence. Maintained notes own conclusions worth reusing after a plan completes. The current procedure for choosing a home lives in [the documentation ownership runbook](../../docs/documentation.md).
