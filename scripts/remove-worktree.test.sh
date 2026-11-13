#!/usr/bin/env bash
# Tests for scripts/remove-worktree.sh. Builds a throwaway git repo per case and
# stubs process stopping through REMOVE_WORKTREE_STOP, so nothing real is killed.
# Run: bash scripts/remove-worktree.test.sh
set -u

SCRIPT="$(cd "$(dirname "$0")" && pwd)/remove-worktree.sh"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

PASS=0
FAIL=0
ok() { PASS=$((PASS + 1)); echo "ok - $1"; }
not_ok() { FAIL=$((FAIL + 1)); echo "not ok - $1"; [ -n "${2:-}" ] && printf '%s\n' "$2" | sed 's/^/    /'; }

# Stub stopper: records the path it was asked about and reports one process.
STUB="$WORK/stub-stop.sh"
cat > "$STUB" <<'EOF'
#!/usr/bin/env bash
echo "$1" >> "$STUB_LOG"
echo "node (123)"
EOF
chmod +x "$STUB"

# new_repo <n>: a repo on "integration" with a worktree on branch "ticket" at $WT.
new_repo() {
  REPO="$WORK/repo$1"
  WT="$WORK/wt$1"
  STUB_LOG="$WORK/log$1"
  : > "$STUB_LOG"
  git init -q -b integration "$REPO"
  cd "$REPO" || exit 1
  git config user.email t@example.com
  git config user.name Test
  git config core.autocrlf false
  echo a > a.txt
  git add . && git commit -qm init
  git worktree add -q -b ticket "$WT"
  # The path as git spells it (on Windows, C:/... rather than /tmp/...).
  WT="$(git worktree list --porcelain | awk '/^worktree /{p=substr($0,10)} $0=="branch refs/heads/ticket"{print p}')"
}

commit_in_worktree() { # commit_in_worktree <file>
  echo x > "$WT/$1"
  git -C "$WT" add "$1" && git -C "$WT" commit -qm "edit $1"
}

run() { # run [args...] -> OUT, CODE
  OUT="$(REMOVE_WORKTREE_STOP="$STUB" STUB_LOG="$STUB_LOG" bash "$SCRIPT" "$@" 2>&1)"
  CODE=$?
}

has_branch() { git rev-parse -q --verify "refs/heads/$1" >/dev/null; }

# 1. Merged branch: processes stopped, worktree, folder and branch gone.
new_repo 1
commit_in_worktree b.txt
git merge -q --no-ff -m merge ticket
mkdir -p "$WT/node_modules" && echo junk > "$WT/node_modules/x" && echo y > "$WT/untracked.txt"
run ticket
if [ "$CODE" -eq 0 ] && [ ! -e "$WT" ] && ! has_branch ticket \
  && grep -qx "$WT" "$STUB_LOG" && grep -q "stopped node (123)" <<<"$OUT" \
  && grep -q "Removed worktree" <<<"$OUT" && ! git worktree list | grep -q "wt1"; then
  ok "merged branch: stops processes, removes worktree and folder, deletes branch"
else
  not_ok "merged branch: stops processes, removes worktree and folder, deletes branch" "code=$CODE out=$OUT"
fi

# 2. Unmerged branch: refused, nothing touched.
new_repo 2
commit_in_worktree b.txt
run ticket
if [ "$CODE" -ne 0 ] && [ -d "$WT" ] && has_branch ticket && [ ! -s "$STUB_LOG" ] && grep -q "not merged" <<<"$OUT"; then
  ok "unmerged branch: refused, nothing touched"
else
  not_ok "unmerged branch: refused, nothing touched" "code=$CODE out=$OUT"
fi

# 3. Uncommitted tracked change: refused, nothing touched.
new_repo 3
echo changed > "$WT/a.txt"
run ticket
if [ "$CODE" -ne 0 ] && [ -d "$WT" ] && has_branch ticket && [ ! -s "$STUB_LOG" ] && grep -q "uncommitted" <<<"$OUT"; then
  ok "uncommitted tracked change: refused, nothing touched"
else
  not_ok "uncommitted tracked change: refused, nothing touched" "code=$CODE out=$OUT"
fi

# 4. Locked worktree (as Claude Code's agent worktrees are): still removed.
new_repo 4
git worktree lock "$WT"
run ticket
if [ "$CODE" -eq 0 ] && [ ! -e "$WT" ] && ! has_branch ticket; then
  ok "locked worktree: unlocked and removed"
else
  not_ok "locked worktree: unlocked and removed" "code=$CODE out=$OUT"
fi

# 5. Branch with no worktree, and a missing branch: refused.
new_repo 5
git branch other
run other
CODE_NO_WT=$CODE; OUT_NO_WT=$OUT
run missing
if [ "$CODE_NO_WT" -ne 0 ] && grep -q "has no worktree" <<<"$OUT_NO_WT" && has_branch other \
  && [ "$CODE" -ne 0 ] && grep -q "does not exist" <<<"$OUT"; then
  ok "no worktree or no branch: refused"
else
  not_ok "no worktree or no branch: refused" "no-wt: $CODE_NO_WT $OUT_NO_WT / missing: $CODE $OUT"
fi

# 6. Wrong usage.
run
if [ "$CODE" -ne 0 ] && grep -q "usage" <<<"$OUT"; then ok "usage error"; else not_ok "usage error" "$OUT"; fi

echo "$PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
