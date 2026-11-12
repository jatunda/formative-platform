#!/usr/bin/env bash
# Merge a finished ticket branch into the checked-out (integration) branch and
# check only what's new.
#
# Usage: scripts/merge-ticket.sh <branch>
#
#   - Refuses on a dirty tree or a missing branch.
#   - Merges --no-ff; the message names the branch and ends with
#     $MERGE_TICKET_TRAILER (default: the Claude Co-Authored-By line).
#   - On a conflict: stops with the merge in progress, lists the files, exits 1.
#   - If the merged tree equals <branch>'s tree, the branch already passed the
#     checks on this tip: skips them.
#   - Otherwise, in web/: npm ci (if node_modules is missing), lint, typecheck,
#     test:coverage; in functions/, only if the merge changed it: npm ci (if
#     node_modules is missing), npm test.
#     Deletes web/coverage/ afterwards. Exits 1 if any check fails.
#   - Never pushes, deletes branches or removes worktrees.
#
# MERGE_TICKET_RUN names a command runner used in place of running each check
# directly (called as `$MERGE_TICKET_RUN npm run lint` from the check's
# directory); scripts/merge-ticket.test.sh uses it to stub the checks.
set -u

die() { echo "merge-ticket: $*" >&2; exit 1; }

[ $# -eq 1 ] || die "usage: scripts/merge-ticket.sh <branch>"
BRANCH="$1"
TRAILER="${MERGE_TICKET_TRAILER:-Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>}"

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || die "not inside a git repository"
cd "$ROOT" || die "cannot cd to $ROOT"

git rev-parse -q --verify "$BRANCH^{commit}" >/dev/null || die "branch '$BRANCH' does not exist"
[ -z "$(git status --porcelain)" ] || die "working tree is dirty (uncommitted changes); commit or clean it first"

INTO="$(git rev-parse --abbrev-ref HEAD)"
if ! git merge --no-ff -q -m "Merge branch '$BRANCH' into $INTO" -m "$TRAILER" "$BRANCH" >/dev/null 2>&1; then
  CONFLICTS="$(git diff --name-only --diff-filter=U)"
  [ -n "$CONFLICTS" ] || die "git merge failed without conflicts; run it by hand to see why"
  echo "CONFLICT merging $BRANCH into $INTO; the merge is left in progress. Conflicted files:"
  printf '%s\n' "$CONFLICTS" | sed 's/^/  /'
  echo "Resolve and commit, or abort with: git merge --abort"
  exit 1
fi

SHA="$(git rev-parse --short HEAD)"
if git diff --quiet "$BRANCH" HEAD; then
  echo "Merged $BRANCH into $INTO at $SHA"
  echo "Checks skipped: merged tree equals $BRANCH's tree (already checked on this tip)"
  exit 0
fi

LOG="$(mktemp)"
trap 'rm -f "$LOG"' EXIT
FAILED=0
SUMMARY=""

check() { # check <dir> <label> <command...>
  local dir="$1" label="$2" count result
  shift 2
  if (cd "$ROOT/$dir" && ${MERGE_TICKET_RUN:+"$MERGE_TICKET_RUN"} "$@") > "$LOG" 2>&1; then
    result="ok"
  else
    result="FAIL"
    FAILED=1
    echo "---- $dir: $* failed; last lines:"
    tail -n 30 "$LOG"
  fi
  count="$(sed $'s/\033\\[[0-9;]*m//g' "$LOG" | grep -aoE 'Tests +[0-9]+ (passed|failed)[^)]*\)?|^(# |ℹ )(pass|fail) [0-9]+' | sed 's/^# //; s/^ℹ //' | paste -sd ',' - | sed 's/,/, /g')"
  SUMMARY="$SUMMARY  $label: $result${count:+ ($count)}"$'\n'
}

[ -d "$ROOT/web/node_modules" ] || check web "npm ci" npm ci
check web lint npm run lint
check web typecheck npm run typecheck
check web "test:coverage" npm run test:coverage
rm -rf "$ROOT/web/coverage"
if ! git diff --quiet HEAD^1 HEAD -- functions; then
  [ -d "$ROOT/functions/node_modules" ] || check functions "functions npm ci" npm ci
  check functions "functions npm test" npm test
fi

echo "Merged $BRANCH into $INTO at $SHA"
echo "Checks run:"
printf '%s' "$SUMMARY"
exit "$FAILED"
