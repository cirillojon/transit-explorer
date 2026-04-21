#!/usr/bin/env bash
# scripts/squash-history.sh
#
# Replaces the entire commit history with a single "Initial commit"
# containing the current working tree. Use this right before making a
# repo public when you want a clean slate (no WIP commits, no old
# author emails, no half-broken intermediate states visible).
#
# This is DESTRUCTIVE. Every commit SHA changes. Every collaborator must
# re-clone afterwards.
#
# Usage:
#   bash scripts/squash-history.sh --plan        # show what will happen
#   bash scripts/squash-history.sh --squash      # do the squash locally
#   bash scripts/squash-history.sh --push        # force-push to origin
#
# Recommended:
#   1. Make a backup branch first: git branch backup-pre-squash
#   2. Make a backup tag too:      git tag backup-pre-squash
#   3. Push the backup somewhere safe (a private repo, an archive).
#   4. Then run --plan, then --squash, inspect, then --push.

set -euo pipefail

MODE="${1:---help}"

# Configurable
BRANCH="${BRANCH:-main}"
COMMIT_MSG="${COMMIT_MSG:-Initial commit}"
BACKUP_REF="backup-pre-squash"

case "$MODE" in
  --help|-h|"")
    sed -n '2,28p' "$0"
    exit 0
    ;;

  --plan)
    echo "Repo:           $(git remote get-url origin 2>/dev/null || echo '(no origin)')"
    echo "Current branch: $(git rev-parse --abbrev-ref HEAD)"
    echo "Target branch:  $BRANCH"
    echo "Commit count:   $(git rev-list --count HEAD)"
    echo "Tags:           $(git tag | wc -l | tr -d ' ')"
    echo
    echo "After --squash:"
    echo "  - $BRANCH will have exactly 1 commit: \"$COMMIT_MSG\""
    echo "  - All other branches and tags will remain locally until you"
    echo "    delete them. Push step only force-pushes $BRANCH."
    echo "  - Backup will be saved as branch+tag '$BACKUP_REF'."
    echo
    echo "Working tree status (must be clean before --squash):"
    git status --short
    ;;

  --squash)
    # Safety: working tree must be clean.
    if [ -n "$(git status --porcelain)" ]; then
      echo "ERROR: working tree is not clean. Commit or stash first." >&2
      git status --short >&2
      exit 1
    fi

    # Safety: must be on the target branch.
    cur=$(git rev-parse --abbrev-ref HEAD)
    if [ "$cur" != "$BRANCH" ]; then
      echo "ERROR: not on $BRANCH (currently on $cur). Run: git checkout $BRANCH" >&2
      exit 1
    fi

    # Save a backup so we can recover.
    if git show-ref --quiet "refs/heads/$BACKUP_REF" || git show-ref --quiet "refs/tags/$BACKUP_REF"; then
      echo "Backup ref '$BACKUP_REF' already exists. Delete it or rename, then retry." >&2
      exit 1
    fi
    git branch "$BACKUP_REF"
    git tag    "$BACKUP_REF"
    echo "==> Backup saved as branch + tag: $BACKUP_REF"

    # The squash itself: create a brand-new orphan branch with no parent,
    # commit the current tree, then move the branch ref over.
    echo "==> Creating orphan branch with current tree..."
    tmp_branch="squash-tmp-$$"
    git checkout --orphan "$tmp_branch"
    git add -A
    git commit -m "$COMMIT_MSG"

    echo "==> Replacing $BRANCH with the squashed commit..."
    git branch -M "$BRANCH"

    # Optional: collapse the local object DB so nothing leaks via reflog.
    # (The remote will only ever see the new tree after --push, but local
    # tools can still fish dropped commits out of .git/objects until gc.)
    git reflog expire --expire=now --all
    git gc --prune=now --aggressive >/dev/null 2>&1 || true

    echo
    echo "Local squash complete. New log:"
    git log --oneline
    echo
    echo "If this looks right, run: bash $0 --push"
    echo "If not, recover with:    git reset --hard $BACKUP_REF"
    ;;

  --push)
    cur=$(git rev-parse --abbrev-ref HEAD)
    if [ "$cur" != "$BRANCH" ]; then
      echo "ERROR: not on $BRANCH (currently on $cur)." >&2
      exit 1
    fi

    echo "About to force-push '$BRANCH' to origin. This rewrites public"
    echo "history. Anyone with an old clone must re-clone."
    echo
    echo "Backup is saved locally as '$BACKUP_REF' (branch + tag)."
    read -r -p "Type 'SQUASH' to confirm: " ans
    if [ "$ans" != "SQUASH" ]; then
      echo "Aborted."
      exit 1
    fi

    git push --force origin "$BRANCH"

    echo
    echo "==> Done. Recommended cleanup:"
    echo "    1. On GitHub, delete every other branch (Settings → Branches)."
    echo "    2. Delete old tags on the remote if you don't want them:"
    echo "         git push --delete origin <tagname>"
    echo "    3. Open Settings → General → Danger Zone if you want to also"
    echo "       reset Pull Requests / Issues numbering (rarely needed)."
    echo "    4. Tell GitHub Support if you need their cached refs purged."
    ;;

  *)
    echo "Unknown mode: $MODE" >&2
    exec "$0" --help
    ;;
esac
