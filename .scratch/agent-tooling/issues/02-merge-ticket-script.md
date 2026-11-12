# 02: One script merges a ticket branch and checks only what's new

**Priority:** high

**What to build:** A script, `scripts/merge-ticket.sh <branch>` at the repo root, that merges a finished ticket branch into the branch that is checked out (the integration branch) and reports in a few lines. It:

1. refuses to run on a dirty tree, or when `<branch>` doesn't exist;
2. merges with `--no-ff`, with a message naming the branch and ending with the `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` line (the line is an argument or env var with that default, so it can change);
3. on a conflict, stops with the merge in progress, lists the conflicted files and exits non-zero, so a person or a merger subagent resolves it;
4. if the merged tree is identical to `<branch>`'s tree (`git diff --quiet <branch> HEAD`: the implementer already merged the tip and passed the checks), skips the checks and says so;
5. otherwise runs, in `web/`: `npm ci` if `node_modules` is missing, then `npm run lint`, `npm run typecheck` and `npm run test:coverage`. If `functions/` changed in the merge, it also runs `npm test` in `functions/`. It deletes `web/coverage/` afterwards;
6. prints a short summary: the merge SHA, checked or skipped, and each check's result (and the test count). It exits non-zero if any check fails.

It never pushes, deletes branches or removes worktrees. Add one line to `CLAUDE.md` pointing at it for merging a ticket branch into an integration branch.

Why: the last session ran 15 merger subagents (about 77k tokens and 2–3 minutes each). Only one hit a conflict, and most re-ran checks on a tree that had already passed them. From the 2026-11-12 retro.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A clean merge whose tree equals the branch's skips the checks and prints the SHA
- [ ] A clean merge that adds commits from the integration branch runs the checks and reports them
- [ ] A conflict stops with the merge in progress and lists the files; nothing is checked
- [ ] Refuses on a dirty tree or a missing branch
- [ ] Runs `functions/` tests only when `functions/` changed
- [ ] Works in Git Bash on Windows (the user's shell) and on Linux
- [ ] Tested: a test script builds a throwaway repo, covers the cases above (with the check commands stubbed) and runs from `npm test` somewhere CI already runs, or from CI directly
- [ ] `CLAUDE.md` has a one-line pointer to it
