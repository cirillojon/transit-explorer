#!/usr/bin/env bash
# scripts/purge-history.sh
#
# Rewrites the entire git history of this repo to remove sensitive files
# and any matching secret patterns. This is a DESTRUCTIVE operation that
# rewrites every commit hash. After running it you must force-push, and
# every collaborator must re-clone.
#
# Usage:
#   bash scripts/purge-history.sh --dry-run      # scan only, no changes
#   bash scripts/purge-history.sh --rewrite      # actually rewrite history
#   bash scripts/purge-history.sh --push         # force-push the rewrite
#
# Prerequisites:
#   - Install git-filter-repo:
#       brew install git-filter-repo            # macOS
#       sudo apt install git-filter-repo        # Ubuntu/Debian
#       pip install git-filter-repo             # everywhere else
#   - Make a fresh clone first; do NOT run this in your working repo:
#       git clone --mirror git@github.com:cirillojon/transit-explorer.git \
#         transit-explorer-purge.git
#       cd transit-explorer-purge.git
#       bash /path/to/scripts/purge-history.sh --dry-run

set -euo pipefail

MODE="${1:---help}"

# --- Files & paths to scrub from every commit -------------------------------
PATHS_TO_REMOVE=(
  ".env"
  "tm-frontend/.env"
  "service-account.json"
  "transit-explorer/service-account.json"
  "tm-instance/data.db"
  "tm-instance"
  "instance/data.db"
)

# --- Secret regex patterns to redact (matched against blob content) ---------
# git-filter-repo replaces these with `***REDACTED***` in every blob.
# Add real patterns specific to your secrets here. The defaults are generic.
cat > /tmp/te-replace.txt <<'EOF'
# Firebase web API keys (start with "AIza")
regex:AIza[0-9A-Za-z_\-]{35}==>***REDACTED-FIREBASE-KEY***
# Generic JWT-style strings (eyJ... base64)
regex:eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}==>***REDACTED-JWT***
# Common bearer-token shape
regex:(?i)bearer\s+[A-Za-z0-9._\-]{20,}==>bearer ***REDACTED***
EOF

case "$MODE" in
  --help|-h|"")
    sed -n '2,30p' "$0"
    exit 0
    ;;

  --dry-run)
    echo "==> Scanning for sensitive paths in history..."
    for p in "${PATHS_TO_REMOVE[@]}"; do
      hits=$(git log --all --diff-filter=A --name-only --pretty=format: -- "$p" \
        2>/dev/null | sort -u | grep -v '^$' || true)
      if [ -n "$hits" ]; then
        echo "  [HIT] $p"
        echo "$hits" | sed 's/^/        /'
      fi
    done
    echo
    echo "==> Scanning for secret patterns (Firebase key, JWT, bearer)..."
    git rev-list --all | head -200 | while read -r sha; do
      git grep -I -nE 'AIza[0-9A-Za-z_\-]{35}|eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}' \
        "$sha" 2>/dev/null | head -20 || true
    done
    echo
    echo "Dry run complete. Re-run with --rewrite to actually purge."
    ;;

  --rewrite)
    if ! command -v git-filter-repo >/dev/null 2>&1; then
      echo "ERROR: git-filter-repo is not installed." >&2
      echo "  brew install git-filter-repo  (or pip install git-filter-repo)" >&2
      exit 1
    fi

    # Safety: require a mirror clone (no working tree).
    if [ -d ".git" ] && [ -d "src" -o -f "package.json" ]; then
      echo "ERROR: this looks like a working repo, not a mirror clone." >&2
      echo "  Re-run inside a fresh: git clone --mirror <url> repo-purge.git" >&2
      exit 1
    fi

    echo "==> Removing files from history..."
    PATH_ARGS=()
    for p in "${PATHS_TO_REMOVE[@]}"; do
      PATH_ARGS+=("--path" "$p")
    done
    git filter-repo --invert-paths --force "${PATH_ARGS[@]}"

    echo "==> Redacting secret patterns from blob content..."
    git filter-repo --replace-text /tmp/te-replace.txt --force

    echo
    echo "Rewrite complete. The history below should no longer reference"
    echo "any of the purged paths or patterns:"
    echo
    git log --oneline | head -10
    echo
    echo "Next step: bash $0 --push"
    ;;

  --push)
    read -r -p "This will force-push every branch and tag. Type 'PURGE' to confirm: " ans
    if [ "$ans" != "PURGE" ]; then
      echo "Aborted."
      exit 1
    fi
    git push --force --all
    git push --force --tags
    echo
    echo "==> Force-push complete. Now:"
    echo "    1. Tell every collaborator to re-clone (do NOT pull)."
    echo "    2. Rotate any keys that may have been in history (see notes)."
    echo "    3. Ask GitHub to purge cached views of old commits via Support"
    echo "       if you suspect the SHAs were indexed: https://support.github.com"
    ;;

  *)
    echo "Unknown mode: $MODE" >&2
    exec "$0" --help
    ;;
esac
