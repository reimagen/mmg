#!/usr/bin/env bash
# Two-way mirror: MMG.aDNA <-> reimagen/mmg (graph is a subtree at MMG.aDNA/ in the repo).
# Usage: how/tools/mirror.sh pull   # start of any CG touch: fetch repo, show doc delta since last mirror
#        how/tools/mirror.sh push   # end of any CG touch: push CG, subtree-pull into repo, push repo
set -euo pipefail
G="$(cd "$(dirname "$0")/../.." && pwd)"; R="$G/what/mmg"; MARK="$G/.mirror-last"
case "${1:-}" in
  pull)
    git -C "$R" pull -q --rebase origin main
    last=$(cat "$MARK" 2>/dev/null || echo HEAD~5)
    echo "== repo commits since last mirror ($last)"; git -C "$R" log --format='%h %an %ad %s' --date=format:%H:%M "$last"..HEAD || true
    echo "== doc/contract files changed"; git -C "$R" diff --stat "$last"..HEAD -- docs README.md CLAUDE.md AGENTS.md memory web/src/lib/types.ts 2>/dev/null || true
    git -C "$R" rev-parse HEAD > "$MARK" ;;
  push)
    git -C "$G" push -q origin main
    git -C "$R" pull -q --rebase origin main
    git -C "$R" subtree pull --prefix=MMG.aDNA git@github.com:jakejjoyner/MMG.aDNA.git main --squash -m "Sync MMG.aDNA context graph" >/dev/null
    git -C "$R" push -q origin main && echo "mirrored: $(git -C "$R" rev-parse --short HEAD)" ;;
  *) echo "usage: $0 pull|push"; exit 2 ;;
esac
