# Handover

Read at session start (CLAUDE.md, "Session handover"). At session end, replace the state section; never append. Done items leave it: PRs and issues record them.

## State (2026-11-03)

Released: v0.3.0 (PR #52). Milestones 0.2.3, 0.3.0 and 0.3.1 are closed. 0.3.1 (#53, #57, #59 and the claude.ai publish of #51) closed without a release (maintainer decision): the package changed only in its README. Next milestone: none planned.

claude.ai: the artifact [pklnx design system](https://claude.ai/artifact/1nh6P45ENo8t4FD2u6FwZt) (type "Design System") holds `project/` of `main` 048228c, version 1793713470-1b47 (#51), checked by hash and by the maintainer. The standalone claude.ai/design holds no copy (#59). Any later change under `project/` needs another publish (README, "Publishing to claude.ai"). The way it is done: the Artifact tool, following the type's `SKILL.md` and the plan on #51. Read the artifact itself before the publish, or the publish is refused.

Open:
- Dependabot (since #49): weekly version update PRs arrive; each gets one review (Sonnet) unless it touches the risk class (CLAUDE.md, step 6).

Decisions to keep:
- Python stays for the three logo scripts (hashed `scripts/requirements-logo.txt`).
- `exports["./theme"]` has only `sass`, no `default` (#30).
- `project/components/Cover/` holds the preview only, no README (claude.ai requirement, #29).
- Every action is pinned to one full commit SHA; `actions/setup-node` only in `.github/actions/setup/`.
- Cloud sessions push only to their assigned branch, so PRs run one after another. After a squash merge, merge `origin/main` into the branch (tree-equal) and push; never force push.
- The coordinator commits only in its own worktree under the scratchpad, never in the main checkout (dev-process `coordinator.md`, Session start step 4). The main checkout can be stale in a cloud session, so agents read rules from `origin/main`, not from its files.
