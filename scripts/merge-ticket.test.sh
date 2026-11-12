#!/usr/bin/env bash
# Tests for scripts/merge-ticket.sh. Builds a throwaway git repo per case and
# stubs the check commands through MERGE_TICKET_RUN, so no npm or network.
# Run: bash scripts/merge-ticket.test.sh
set -u

SCRIPT="$(cd "$(dirname "$0")" && pwd)/merge-ticket.sh"
# The default trailer, read from its one home in the script.
DEFAULT_TRAILER="$(sed -n 's/^DEFAULT_TRAILER="\(.*\)"$/\1/p' "$SCRIPT")"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

PASS=0
FAIL=0
ok() { PASS=$((PASS + 1)); echo "ok - $1"; }
not_ok() { FAIL=$((FAIL + 1)); echo "not ok - $1"; [ -n "${2:-}" ] && printf '%s\n' "$2" | sed 's/^/    /'; }

# Stub check runner: records "<dir> <command>" and prints test-count lines
# like vitest and node --test. Fails any command listed in STUB_FAIL.
STUB="$WORK/stub-run.sh"
cat > "$STUB" <<'EOF'
#!/usr/bin/env bash
echo "$(basename "$PWD") $*" >> "$STUB_LOG"
case "$*" in
  # vitest colours its summary even when piped
  "npm run test:coverage") mkdir -p coverage
    printf '\033[2m      Tests \033[22m \033[1m\033[32m42 passed\033[39m\033[22m\033[90m (42)\033[39m\n' ;;
  "npm test") echo "# pass 7" ;;
esac
case " ${STUB_FAIL:-} " in *" $* "*) echo "stub: $* failed"; exit 1 ;; esac
exit 0
EOF
chmod +x "$STUB"

# new_repo: a repo with web/ and functions/ on branch "integration".
new_repo() {
  REPO="$WORK/repo$1"
  STUB_LOG="$WORK/log$1"
  : > "$STUB_LOG"
  git init -q -b integration "$REPO"
  cd "$REPO" || exit 1
  git config user.email t@example.com
  git config user.name Test
  git config core.autocrlf false
  mkdir -p web functions
  echo a > web/a.txt
  echo f > functions/f.txt
  git add . && git commit -qm init
}

commit_file() { # commit_file <path> <content>
  mkdir -p "$(dirname "$1")"
  echo "$2" > "$1"
  git add "$1" && git commit -qm "edit $1"
}

run() { # run [args...] -> OUT, CODE
  OUT="$(MERGE_TICKET_RUN="$STUB" STUB_LOG="$STUB_LOG" bash "$SCRIPT" "$@" 2>&1)"
  CODE=$?
}

expect_code_nonzero() { [ "$CODE" -ne 0 ] && ok "$1" || not_ok "$1 (exit $CODE)" "$OUT"; }
expect_code_zero() { [ "$CODE" -eq 0 ] && ok "$1" || not_ok "$1 (exit $CODE)" "$OUT"; }
expect_out() { printf '%s' "$OUT" | grep -qE -- "$2" && ok "$1" || not_ok "$1: no /$2/" "$OUT"; }
expect_log() { grep -qxF -- "$2" "$STUB_LOG" && ok "$1" || not_ok "$1: no '$2' in log" "$(cat "$STUB_LOG")"; }
expect_no_log() { [ ! -s "$STUB_LOG" ] && ok "$1" || not_ok "$1" "$(cat "$STUB_LOG")"; }

echo "# missing branch"
new_repo 1
run no-such-branch
expect_code_nonzero "missing branch exits non-zero"
expect_out "missing branch is named" "no-such-branch"
expect_no_log "missing branch runs no checks"

echo "# dirty tree"
new_repo 2
git checkout -qb ticket && commit_file web/b.txt b && git checkout -q integration
echo dirty >> web/a.txt
run ticket
expect_code_nonzero "dirty tree exits non-zero"
expect_out "dirty tree says so" "[Dd]irty|uncommitted"
[ "$(git rev-parse HEAD)" = "$(git rev-parse integration)" ] && [ ! -f web/b.txt ] \
  && ok "dirty tree merges nothing" || not_ok "dirty tree merges nothing"

echo "# merged tree equals the branch's tree"
new_repo 3
git checkout -qb ticket && commit_file web/b.txt b && git checkout -q integration
run ticket
expect_code_zero "identical tree exits zero"
expect_out "identical tree skips checks" "[Ss]kipped"
expect_out "prints merge SHA" "$(git rev-parse --short HEAD)"
expect_no_log "identical tree runs no checks"
[ "$(git rev-list --count --merges HEAD)" = 1 ] && ok "merge is --no-ff" || not_ok "merge is --no-ff"
MSG="$(git log -1 --format=%B)"
printf '%s' "$MSG" | grep -q "ticket" && ok "message names the branch" || not_ok "message names the branch" "$MSG"
[ -n "$DEFAULT_TRAILER" ] && printf '%s' "$MSG" | tail -n 1 | grep -qxF -- "$DEFAULT_TRAILER" \
  && ok "message ends with the default trailer" || not_ok "message ends with the default trailer '$DEFAULT_TRAILER'" "$MSG"

echo "# trailer override"
new_repo 4
git checkout -qb ticket && commit_file web/b.txt b && git checkout -q integration
MERGE_TICKET_TRAILER="Co-Authored-By: Someone <s@example.com>" run ticket
git log -1 --format=%B | grep -qxF "Co-Authored-By: Someone <s@example.com>" \
  && ok "trailer comes from MERGE_TICKET_TRAILER" || not_ok "trailer comes from MERGE_TICKET_TRAILER" "$(git log -1 --format=%B)"

echo "# integration branch moved on: web checks run"
new_repo 5
git checkout -qb ticket && commit_file web/b.txt b && git checkout -q integration
commit_file web/c.txt c
run ticket
expect_code_zero "passing checks exit zero"
expect_log "npm ci when node_modules is missing" "web npm ci"
expect_log "lint runs in web" "web npm run lint"
expect_log "typecheck runs in web" "web npm run typecheck"
expect_log "coverage runs in web" "web npm run test:coverage"
grep -q "^functions " "$STUB_LOG" && not_ok "functions tests skipped when functions/ unchanged" "$(cat "$STUB_LOG")" \
  || ok "functions tests skipped when functions/ unchanged"
expect_out "summary prints merge SHA" "$(git rev-parse --short HEAD)"
expect_out "summary reports the test count" "42 passed"
expect_out "summary reports lint" "lint.*(ok|pass)"
[ ! -d web/coverage ] && ok "web/coverage is deleted" || not_ok "web/coverage is deleted"

echo "# node_modules present: no npm ci"
new_repo 6
git checkout -qb ticket && commit_file web/b.txt b && git checkout -q integration
commit_file web/c.txt c
mkdir -p web/node_modules
run ticket
grep -qxF "web npm ci" "$STUB_LOG" && not_ok "no npm ci when node_modules exists" || ok "no npm ci when node_modules exists"

echo "# functions/ changed: functions tests run"
new_repo 7
git checkout -qb ticket && commit_file functions/g.txt g && git checkout -q integration
commit_file web/c.txt c
run ticket
expect_log "functions npm ci when its node_modules is missing" "functions npm ci"
expect_log "functions tests run" "functions npm test"
expect_out "summary reports functions test count" "pass 7"

echo "# a failing check"
new_repo 8
git checkout -qb ticket && commit_file web/b.txt b && git checkout -q integration
commit_file web/c.txt c
STUB_FAIL="npm run typecheck" run ticket
expect_code_nonzero "failing check exits non-zero"
expect_out "failing check is reported" "typecheck.*FAIL"
expect_log "later checks still run" "web npm run test:coverage"

echo "# conflict"
new_repo 9
git checkout -qb ticket && commit_file web/a.txt theirs && git checkout -q integration
commit_file web/a.txt ours
run ticket
expect_code_nonzero "conflict exits non-zero"
expect_out "conflicted file is listed" "web/a.txt"
git rev-parse -q --verify MERGE_HEAD >/dev/null && ok "merge left in progress" || not_ok "merge left in progress"
expect_no_log "conflict runs no checks"

echo "# already merged"
new_repo 10
git checkout -qb ticket && commit_file web/b.txt b && git checkout -q integration
git merge -q --no-ff -m "merge ticket" ticket
commit_file web/c.txt c
BEFORE="$(git rev-parse HEAD)"
run ticket
expect_code_zero "already merged exits zero"
expect_out "already merged says so" "already merged"
expect_no_log "already merged runs no checks"
[ "$(git rev-parse HEAD)" = "$BEFORE" ] && ok "already merged makes no commit" || not_ok "already merged makes no commit"
printf '%s' "$OUT" | grep -q "^Merged" && not_ok "already merged doesn't claim a merge" "$OUT" || ok "already merged doesn't claim a merge"

echo "# a branch named like a path"
new_repo 11
git checkout -qb web && commit_file web/b.txt b && git checkout -q integration
run web
expect_code_zero "branch named web exits zero"
expect_out "branch named web compares trees, not paths" "[Ss]kipped"
expect_no_log "branch named web runs no checks"

echo "# detached HEAD"
new_repo 12
git checkout -qb ticket && commit_file web/b.txt b && git checkout -q integration
git checkout -q --detach
BEFORE="$(git rev-parse HEAD)"
run ticket
expect_code_nonzero "detached HEAD exits non-zero"
expect_out "detached HEAD says so" "detached"
expect_no_log "detached HEAD runs no checks"
[ "$(git rev-parse HEAD)" = "$BEFORE" ] && ok "detached HEAD merges nothing" || not_ok "detached HEAD merges nothing"

cd "$WORK" || exit 1
echo "# $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
