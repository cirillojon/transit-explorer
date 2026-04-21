# Git history purge & squash runbook

> **DESTRUCTIVE OPERATIONS.** Read this whole file before running anything.

This file covers two related but distinct procedures:

| Goal                                                                                    | Use this                                                                |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Remove a specific file or secret from every commit, but otherwise keep history readable | [Surgical purge](#surgical-purge) (`scripts/purge-history.sh`)          |
| Collapse the entire history into one fresh "Initial commit" before going public         | [Clean-slate squash](#clean-slate-squash) (`scripts/squash-history.sh`) |

If you're not sure which you want: **squash** is the right answer for
"I'm about to make this repo public and want it to look like day one."
**Purge** is the right answer for "I committed a secret three months ago
and want it gone but want to keep the rest of history."

---

## Clean-slate squash

Replaces every commit with a single `Initial commit` that contains the
current working tree. After this, there is no visible history of WIP
commits, refactors, or old author info.

### Procedure

```bash
# 0. Make sure your working tree is exactly what you want the world to see.
git status                  # must be clean
npm test --prefix tm-frontend
pytest tests/ -q

# 1. Inspect the plan
bash scripts/squash-history.sh --plan

# 2. Squash locally (creates `backup-pre-squash` branch + tag automatically)
bash scripts/squash-history.sh --squash

# 3. Sanity check the new tree
git log --oneline           # → exactly 1 commit
git ls-files | wc -l        # → file count matches your working tree

# 4. Force-push to GitHub
bash scripts/squash-history.sh --push    # asks you to type 'SQUASH'
```

### After squashing — required cleanup

The local script only rewrites `main`. You almost certainly also want:

```bash
# Delete every other branch on GitHub (web UI is easiest), or:
git push origin --delete <branch>

# Delete tags you don't want public:
git tag                                  # list local tags
git push origin --delete <tagname>       # remove from remote
git tag -d <tagname>                     # remove locally
```

In the GitHub web UI:

- **Settings → Branches**: delete stale branches.
- **Settings → General → Default branch**: confirm `main` still set.
- **Issues / Pull Requests**: existing issues survive; old PRs reference
  rewritten SHAs and will look broken (the diffs are gone). If you have
  PRs you want to preserve, export them first (e.g. via `gh pr list
--json` or screenshots) before squashing.
- **Insights → Network**: regenerates after the next push; the old graph
  is fully gone.

### Recovery

If the squash looks wrong **before you push**:

```bash
git reset --hard backup-pre-squash
```

If you've already pushed and a collaborator still has the old history
in a clone, restore from their copy:

```bash
git fetch <their-remote> 'refs/heads/*:refs/heads/recovered/*'
git push --force origin recovered/main:main
```

After you're confident the new history is permanent and good, delete
the backup so it doesn't leak:

```bash
git branch -D backup-pre-squash
git tag    -d backup-pre-squash
```

### Caveats specific to going public

- Anything still referenced by an open PR or an old SHA URL
  (`github.com/<owner>/<repo>/commit/<old-sha>`) stays accessible until
  GitHub garbage-collects (~90 days). Ask Support to expedite if needed.
- The squash does not rotate any committed secrets — combine with the
  [Surgical purge](#surgical-purge) workflow if you specifically need
  blob content scrubbed and you're sure secrets exist in history.
- For this repo, a recent dry-run scan found **no** sensitive paths or
  Firebase/JWT-shaped strings in any of the 52 commits, so a plain
  squash is sufficient. Re-run the scan in
  `scripts/purge-history.sh --dry-run` if you want to double-check.

---

## Surgical purge

Use this when you need to remove a file or secret from **every commit** in
the repo's history — not just the latest commit. Common reasons:

- A `.env` or `service-account.json` slipped into git at some point.
- A hard-coded API key was committed and you want it gone from `git log`.
- You want to scrub specific paths but otherwise preserve the commit
  log (e.g. for attribution or release-note generation).

If you only need to remove something from the **current** working tree,
plain `git rm` + commit is enough. This runbook is for purging history.

### What this does

1. Removes a configurable list of paths (e.g. `.env`, `service-account.json`)
   from every commit in every branch and tag.
2. Replaces matching secret regex patterns inside any blob with
   `***REDACTED***`.
3. Force-pushes the rewritten history to GitHub.
4. Old commit SHAs become orphaned and eventually garbage-collected by GitHub.

The script (`scripts/purge-history.sh`) supports three modes:

| Mode        | What it does                                   |
| ----------- | ---------------------------------------------- |
| `--dry-run` | Scans history and reports hits. No changes.    |
| `--rewrite` | Performs the rewrite on a **mirror clone**.    |
| `--push`    | Force-pushes the rewritten mirror to `origin`. |

## Prerequisites

```bash
# Install git-filter-repo (modern replacement for git filter-branch / BFG)
brew install git-filter-repo                # macOS
sudo apt install git-filter-repo            # Debian/Ubuntu
pip install git-filter-repo                 # everywhere else
```

Verify: `git filter-repo --version`

## Procedure

### 1. Coordinate

- Tell every collaborator that history is about to be rewritten.
- Pick a maintenance window when no one is mid-PR.
- Note the current `HEAD` SHA so you can verify the post-rewrite tree
  matches: `git rev-parse HEAD`.

### 2. Open issues / PRs

Open PRs will continue to reference old SHAs after the rewrite. Plan to
either close+reopen them or rebase them onto the new history.

### 3. Run a dry-run scan in the existing repo

From the working repo (NOT a mirror clone):

```bash
cd transit-explorer
bash scripts/purge-history.sh --dry-run
```

Review the [HIT] lines. If anything legitimate would be removed (e.g. a
file you actually want to keep), edit `PATHS_TO_REMOVE` in the script
before continuing.

### 4. Make a mirror clone for the rewrite

```bash
cd ..
git clone --mirror git@github.com:cirillojon/transit-explorer.git \
  transit-explorer-purge.git
cd transit-explorer-purge.git
```

A mirror clone is a bare repo containing every ref. The rewrite tool
refuses to work on anything else.

### 5. Rewrite

```bash
bash ../transit-explorer/scripts/purge-history.sh --rewrite
```

This prints the new HEAD log. Spot-check a few commits to confirm the
purged paths really are gone:

```bash
git log --all --name-only -- .env tm-frontend/.env service-account.json
# → should print nothing.
```

### 6. Push

```bash
bash ../transit-explorer/scripts/purge-history.sh --push
# Type "PURGE" to confirm.
```

This force-pushes every branch and tag.

### 7. Notify everyone & re-clone

The rewritten history changes every commit SHA, so any existing local
clone (yours included) is now wrong.

```bash
# In your old working clone:
cd ~/projects/transit-explorer
cd ..
mv transit-explorer transit-explorer.old
git clone git@github.com:cirillojon/transit-explorer.git
```

DO NOT `git pull` into the old clone — git will happily merge old + new
history together and undo half the rewrite.

### 8. Rotate any exposed secrets

History purge is **not** a substitute for rotation. Anything that was ever
public in a git push must be considered compromised:

- Firebase Web API keys (regenerate via Firebase console).
- OneBusAway API key (request a new one).
- Service-account JSON (Firebase console → Service accounts → revoke +
  generate new).
- Any other tokens that appeared in `--dry-run` output.

### 9. Ask GitHub to purge their caches (optional)

GitHub keeps unreachable commits accessible via direct SHA URLs for ~90
days. If you need them gone immediately, contact GitHub Support:

> "We rewrote git history on `<repo URL>` to remove sensitive content.
> Please purge cached references to the old commits."

Until they do, anyone who knows an old SHA can still fetch it via the
web UI (e.g. `github.com/<owner>/<repo>/commit/<old-sha>`).

## Post-rewrite verification

```bash
# History no longer contains the files
git log --all --name-only -- .env service-account.json
# → empty

# CI passes on the rewritten history
git push origin main      # triggers .github/workflows/ci.yml

# Production deploys cleanly
flyctl deploy --local-only --ha=false --strategy immediate
```

## Recovery

If the rewrite goes wrong, the mirror clone keeps the original refs at
`refs/original/`. To roll back BEFORE the force-push:

```bash
cd transit-explorer-purge.git
git for-each-ref --format='%(refname)' refs/original/ | \
  while read ref; do
    new=${ref#refs/original/}
    git update-ref "$new" "$ref"
  done
```

If you've already force-pushed, recovery is much harder — restore from a
collaborator's old clone. For this reason: **always keep at least one
old clone untouched until you're sure the rewrite is good.**
