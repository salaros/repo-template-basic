#!/bin/sh
# scripts/skills-relink.sh
# Rewrites the per-harness skill links (.claude/skills/<name>, and any other <dir>/skills/<name>
# pointing into .agents/skills) as relative symlinks, so Git stores links rather than copies.
# `npx skills` creates absolute junctions on Windows; on Linux/macOS its links are already
# relative and nothing changes. Windows needs Developer Mode or an elevated shell for symlinks.
# The logic lives in scripts/skills.js (relink); this is the shell entry point.
# Usage: sh scripts/skills-relink.sh
script_dir=$(cd -P -- "$(dirname -- "$0")" && pwd)
command -v node >/dev/null 2>&1 || { echo "node is required" >&2; exit 1; }
exec node "$script_dir/skills.js" relink
