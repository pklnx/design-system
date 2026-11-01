# Workflow

Roles: maintainer (human), coordinator (Claude: orders the backlog, plans, delegates, merges), implementer (one PR each), reviewer, plan-reviewer (never the planner). Coordination, ticket loop, reviews and models: [pklnx/dev-process](https://github.com/pklnx/dev-process) (`coordinator.md`, `decisions.md`, `models.md`).

Language: German with the maintainer; English on GitHub and in code. Every GitHub text ends with `— Claude, <role>`; no model names on GitHub.

## Ticket flow
1. Issue with a "Done when" list.
2. `plan` → `## Plan` comment → `review` → independent plan review → `ready`. Only `ready` issues are built; small fixes whose issue already names the fix may skip the plan.
3. One branch and PR per issue or part; body "Closes #<n>.".
4. Merge: approving review, green required checks, Done-when list met; squash merge pinned to the reviewed head SHA. Never auto-merge; never change rulesets or repository settings.
5. Releases are planned in milestones (`README.md`, "Milestones"); releasing needs the maintainer's OK (`README.md`, "Releasing").

## GitHub operations
Commands per operation: `.claude/github-operations.md`, read before the first GitHub write. An MCP `issue_write` labels update replaces the whole set.

## Rules
- Before a push: `npm test`. A change to a build script or a generated file also runs the steps of `README.md`, "Building", and leaves `git status --porcelain` empty, as CI does.
- Every behaviour change has tests; a bug fix has a regression test that fails without the fix.
- Generated files are committed together with the change that produces them.
- The package contents are fixed by `scripts/check-pack.mjs`; a change to `package.json` `files` or `exports` follows the version policy (`README.md`, "Version policy").
