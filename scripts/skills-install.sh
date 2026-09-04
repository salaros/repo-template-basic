#!/bin/sh
# scripts/skills-install.sh
# Installs every skill listed in skills.json into .agents/skills and links it into the
# harness directories listed there (e.g. .claude/skills), using `npx skills add`.
# Then normalises the links so git can track them (see skills-relink.sh).
# Usage: sh scripts/skills-install.sh
set -e

# Resolve the repo root from this script's location so it works from any directory
script_dir=$(cd -P -- "$(dirname -- "$0")" && pwd)
cd "$(dirname -- "$script_dir")"

command -v node >/dev/null 2>&1 || { echo "node is required (npx skills is a Node CLI)" >&2; exit 1; }
[ -f skills.json ] || { echo "skills.json not found in $(pwd)" >&2; exit 1; }

agents=$(node -p 'require("./skills.json").agents.join(",")')

# One `npx skills add` per source: "<source> <skill,skill,...>" per line
node -e '
    const m = require("./skills.json");
    for (const [source, skills] of Object.entries(m.sources)) console.log(source, skills.join(","));
' | while read -r source skills; do
    echo "==> $source: $skills"
    npx --yes skills@latest add "$source" -s "$skills" -a "$agents" -y
done

sh "$script_dir/skills-relink.sh"
echo "Skills installed. Review skills-lock.json and the harness links, then commit."
