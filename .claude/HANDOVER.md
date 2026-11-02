# Handover

Read at session start (CLAUDE.md, "Session handover"). At session end, replace the state section; never append. Done items leave it: PRs and issues record them.

## State (2026-11-02)

Released: v0.3.0 (milestone 0.3.0, PR #52). Next milestone: none planned yet.

Open:
- #51 (maintainer action): at the next claude.ai publish, re-upload `project/assets/Social/pklnx-og-image.svg` and `pklnx-banner.svg` and put their new blob ids into `project/design-system.json` and `project/components/SocialKit/preview.html`.
- Milestones 0.2.3 and 0.3.0: all issues closed; close them (REST, dev-process `decisions.md` G26) if still open.
- Dependabot (since #49): weekly version update PRs arrive; each gets one review (Sonnet) unless it touches the risk class (CLAUDE.md, step 6).

Decisions to keep:
- Python stays for the three logo scripts (hashed `scripts/requirements-logo.txt`).
- `exports["./theme"]` has only `sass`, no `default` (#30).
- `project/components/Cover/` holds the preview only, no README (claude.ai requirement, #29).
- Every action is pinned to one full commit SHA; `actions/setup-node` only in `.github/actions/setup/`.
- Cloud sessions push only to their assigned branch, so PRs run one after another. After a squash merge, merge `origin/main` into the branch (tree-equal) and push; never force push. Pass `commit_message` on every squash merge.
- The coordinator commits only in its own worktree under the scratchpad, never in the main checkout (dev-process `coordinator.md`, Session start step 4).
