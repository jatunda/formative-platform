#!/usr/bin/env bash
# Remove a merged ticket branch's worktree, and the branch, even when a dev
# server or test watcher started there is still running.
#
# Usage: scripts/remove-worktree.sh <branch>
#
#   - Refuses unless <branch> is merged into the checked-out branch, so no
#     commit is lost. Refuses if <branch> has no worktree.
#   - Stops every process whose command line names the worktree's absolute
#     path (a leftover vite or esbuild holds files open, and on Windows that
#     makes `git worktree remove` fail halfway: deregistered, folder left
#     behind). npm and npx launch tools by absolute path, so those are found;
#     one started with a relative path is not. Run it from a shell whose own
#     command line doesn't contain that path, or it stops that shell too.
#   - Unlocks and removes the worktree, deletes any folder left behind, then
#     deletes <branch> with `git branch -d`.
#   - Refuses (leaving everything in place) if the worktree has uncommitted
#     changes to tracked files; untracked files are deleted with the folder.
#   - Prints one line per process stopped and one summary line.
#
# REMOVE_WORKTREE_STOP names a command used in place of stopping processes
# (called as `$REMOVE_WORKTREE_STOP <path>`; it prints one line per process it
# stopped); scripts/remove-worktree.test.sh uses it to stub process handling.
set -u

die() { echo "remove-worktree: $*" >&2; exit 1; }

[ $# -eq 1 ] || die "usage: scripts/remove-worktree.sh <branch>"
BRANCH="$1"

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || die "not inside a git repository"
cd "$ROOT" || die "cannot cd to $ROOT"

git rev-parse -q --verify "refs/heads/$BRANCH" >/dev/null || die "branch '$BRANCH' does not exist"
git merge-base --is-ancestor "$BRANCH" HEAD || die "'$BRANCH' is not merged into $(git symbolic-ref -q --short HEAD || echo HEAD); merge it first"

# The worktree whose HEAD is refs/heads/<branch>.
WT="$(git worktree list --porcelain | awk -v ref="refs/heads/$BRANCH" '
  /^worktree / { path = substr($0, 10) }
  $0 == "branch " ref { print path }')"
[ -n "$WT" ] || die "branch '$BRANCH' has no worktree"
[ "$WT" != "$ROOT" ] || die "'$BRANCH' is checked out in this checkout; run from the integration branch"

if [ -d "$WT" ] && [ -n "$(git -C "$WT" status --porcelain --untracked-files=no 2>/dev/null)" ]; then
  die "$WT has uncommitted changes to tracked files; commit or discard them first"
fi

stop_processes() { # stop_processes <path>: stop each process naming <path>, print its name
  local path="$1"
  if command -v powershell.exe >/dev/null 2>&1; then
    local winpath
    winpath="$(cygpath -w "$path" 2>/dev/null || printf '%s' "$path")"
    # Command lines may spell the path with either slash.
    WT_A="$winpath" WT_B="${winpath//\\//}" powershell.exe -NoProfile -NonInteractive -Command '
      Get-CimInstance Win32_Process |
        Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -and
          ($_.CommandLine.Contains($env:WT_A) -or $_.CommandLine.Contains($env:WT_B)) } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; "$($_.Name) ($($_.ProcessId))" }' \
      | tr -d '\r'
  else
    local pid
    for pid in $(pgrep -f -- "$path" 2>/dev/null); do
      [ "$pid" = "$$" ] && continue
      echo "$(ps -o comm= -p "$pid" 2>/dev/null || echo process) ($pid)"
      kill "$pid" 2>/dev/null
    done
  fi
}

STOPPED="$(if [ -n "${REMOVE_WORKTREE_STOP:-}" ]; then "$REMOVE_WORKTREE_STOP" "$WT"; else stop_processes "$WT"; fi)"
[ -z "$STOPPED" ] || printf '%s\n' "$STOPPED" | sed 's/^/stopped /'

git worktree unlock "$WT" >/dev/null 2>&1
# --force only covers untracked and ignored files (node_modules, coverage):
# tracked changes were refused above.
git worktree remove --force "$WT" >/dev/null 2>&1
git worktree prune
if [ -e "$WT" ]; then
  rm -rf "$WT" 2>/dev/null
  [ ! -e "$WT" ] || die "could not delete $WT (a file is still in use); the worktree is deregistered, delete the folder by hand"
fi

git branch -q -d "$BRANCH" || die "worktree removed, but deleting branch '$BRANCH' failed"
echo "Removed worktree $WT and branch $BRANCH"
