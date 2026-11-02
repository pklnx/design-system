# Workflow

Roles: maintainer (human), coordinator (Claude: orders the backlog, plans, delegates, merges), implementer (one PR each), reviewer, plan-reviewer (never the planner). Coordination, ticket loop, reviews and models: [pklnx/dev-process](https://github.com/pklnx/dev-process) (`coordinator.md`, `decisions.md`, `models.md`).

Language: German with the maintainer; English on GitHub and in code. Every GitHub text ends with `— Claude, <role>`; no model names on GitHub.

## Ticket flow
1. Issue with a "Done when" list.
2. Coordinator or maintainer labels `plan` → `## Plan` comment (approach, files, tests, open questions, size); label becomes `review`. Small fixes whose issue already names the fix may skip the plan.
3. A plan-reviewer (never the planner) reviews independently; it or the maintainer replaces `review` with `ready`. Only `ready` issues are built.
4. Several parts: one sub-issue per part, created with the plan, titled "<what> (#N, part K)", linked as GitHub sub-issue (by `id`, not number). The main issue's `ready` covers them; it closes with the last part.
5. One branch and PR per issue or part; body "Closes #<n>." (a part also "Part K of #N.").
6. Review: one session review for every PR. The risk class also gets a second, independent session reviewer who has not seen the first; the coordinator marks those PRs `second-review`. Risk class: (a) release and deploy: `.github/workflows/release.yml`, workflow permissions, the Pages deploy job, the composite action `.github/actions/setup/`; (b) package contents: `package.json` `files` and `exports`, and the shipped files (`theme/*.css`, `theme/_index.scss`, `theme/tokens.json`, `project/fonts/`); (c) code that empties directories or deletes files, such as the output-dir guard of `scripts/build_site.mjs`. Docs, CI outside (a) and test-only PRs: one session review (Sonnet) and green required checks.
7. Merge: approving review, green required checks, Done-when list met; squash merge pinned to the reviewed head SHA. Never auto-merge; never change rulesets or repository settings.
8. Releases are planned in milestones (`README.md`, "Milestones"); releasing needs the maintainer's OK (`README.md`, "Releasing").

## GitHub operations
Commands per operation: `.claude/github-operations.md`, read before the first GitHub write. An MCP `issue_write` labels update replaces the whole set.

## Rules
- Before a push: `npm test`. A change to a build script or a generated file also runs `npm run build:all` (`README.md`, "Building") and leaves `git status --porcelain` empty, as CI does.
- Every behaviour change has tests; a bug fix has a regression test that fails without the fix.
- Generated files are committed together with the change that produces them.
- The package contents are fixed by `scripts/check-pack.mjs`; a change to `package.json` `files` or `exports` follows the version policy (`README.md`, "Version policy").

## Session handover
Start: read `.claude/HANDOVER.md`; follow-ups are open `followup` issues, queried when needed. End: replace its state, never append.
