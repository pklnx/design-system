# Handover

Read at session start (CLAUDE.md, "Session handover"). At session end, replace the state section; never append. Done items leave it: PRs and issues record them.

## State (2026-11-02, evening)

Released: v0.3.0 (PR #52); milestones 0.2.3 and 0.3.0 are closed. Next milestone: [0.3.1](https://github.com/pklnx/design-system/milestone/3), created by the coordinator via REST (dev-process G26). It holds #53 (`marked` 14.1.4 to 18.1.1, merged); that PR left the package contents unchanged, so it needs no release on its own. 0.3.1 has no release goal yet.

Open:
- #51 (maintainer action): at the next claude.ai publish, re-upload `project/assets/Social/pklnx-og-image.svg` and `pklnx-banner.svg` and put their new blob ids into `project/design-system.json` and `project/components/SocialKit/preview.html`.
- Dependabot (since #49): weekly version update PRs arrive; each gets one review (Sonnet) unless it touches the risk class (CLAUDE.md, step 6).

Decisions to keep:
- Python stays for the three logo scripts (hashed `scripts/requirements-logo.txt`).
- `exports["./theme"]` has only `sass`, no `default` (#30).
- `project/components/Cover/` holds the preview only, no README (claude.ai requirement, #29).
- Every action is pinned to one full commit SHA; `actions/setup-node` only in `.github/actions/setup/`.
- Cloud sessions push only to their assigned branch, so PRs run one after another. After a squash merge, merge `origin/main` into the branch (tree-equal) and push; never force push.
- The coordinator commits only in its own worktree under the scratchpad, never in the main checkout (dev-process `coordinator.md`, Session start step 4).
