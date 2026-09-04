#!/bin/sh
# scripts/skills-install.sh
# Restores every skill recorded in skills-lock.json into .agents/skills with
# `npx skills experimental_install`, then normalises the harness links (see skills-relink.sh).
# Skills are committed, so a normal clone never needs this; run it when .agents/skills is
# missing or damaged, or after a merge that changed the lock file.
# To add a skill, use the CLI directly and commit the result:
#   npx skills add <owner/repo> -s <skill> -a claude-code codex -y && sh scripts/skills-relink.sh
# Usage: sh scripts/skills-install.sh
set -e

# Resolve the repo root from this script's location so it works from any directory
script_dir=$(cd -P -- "$(dirname -- "$0")" && pwd)
cd "$(dirname -- "$script_dir")"

command -v node >/dev/null 2>&1 || { echo "node is required (npx skills is a Node CLI)" >&2; exit 1; }
[ -f skills-lock.json ] || { echo "skills-lock.json not found in $(pwd)" >&2; exit 1; }

npx --yes skills@latest experimental_install
sh "$script_dir/skills-relink.sh"
echo "Skills restored from skills-lock.json."
