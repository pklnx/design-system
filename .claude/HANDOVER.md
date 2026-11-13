# Handover

Read at session start (CLAUDE.md, "Session handover"). At session end, replace the state section; never append. Done items leave it: PRs and issues record them.

## State (2026-11-13)

Released: v0.3.0 (PR #52). Milestones 0.2.3, 0.3.0 and 0.3.1 are closed. 0.3.1 (#53, #57, #59 and the claude.ai publish of #51) closed without a release (maintainer decision): the package changed only in its README. Next milestone: 0.3.2 (#67, PR #71 open).

claude.ai: the artifact [pklnx design system](https://claude.ai/artifact/1nh6P45ENo8t4FD2u6FwZt) (type "Design System") holds `project/` of `main` 526f6ed, version 1794581213-4d71. #72 uploaded the 20 Dokumentum assets and published five text files (version 1794562101-0b97, checked by hash and by resvg render equality); the version moved later with the `project/` text files unchanged (sha256 checked on 2026-11-13), and the maintainer checked the Assets pane. The standalone claude.ai/design holds no copy (#59). Any later change under `project/` needs another publish (README, "Publishing to claude.ai"). The way it is done: the Artifact tool, following the type's `SKILL.md` and the plan on #51. Read the artifact itself before the publish, or the publish is refused.

Open:
- #73: two script-robustness tests fail on macOS only (`npm test`).
- #67 (milestone 0.3.2): render-previews exits 0 when a preview throws; PR #71 is open for it.
- Dependabot (since #49): weekly version update PRs arrive; each gets one review (Sonnet) unless it touches the risk class (CLAUDE.md, step 6).

Decisions to keep:
- Python stays for the three logo scripts (hashed `scripts/requirements-logo.txt`).
- `exports["./theme"]` has only `sass`, no `default` (#30).
- `project/components/Cover/` holds the preview only, no README (claude.ai requirement, #29).
- Every action is pinned to one full commit SHA; `actions/setup-node` only in `.github/actions/setup/`.
- Cloud sessions push only to their assigned branch, so PRs run one after another. After a squash merge, merge `origin/main` into the branch (tree-equal) and push; never force push.
- The coordinator commits only in its own worktree under the scratchpad, never in the main checkout (dev-process `coordinator.md`, Session start step 4). The main checkout can be stale in a cloud session, so agents read rules from `origin/main`, not from its files.
