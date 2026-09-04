#!/bin/sh
# .agents/hooks/session-start.sh
# One-screen brief for an agent starting a session in this repo. Harness-neutral: takes no
# arguments, ignores stdin, always exits 0. Whatever it prints lands in the agent's context.
# Wire it to your harness's session-start event (README, "Files per AI tool").
cd "$(dirname -- "$0")/../.." || exit 0

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "not a git checkout")
echo "branch: $branch"

[ -f .git/hooks/post-merge ] || echo "git hooks: not installed. Run: sh scripts/githooks-init.sh"

if command -v node >/dev/null 2>&1 && [ -f skills-lock.json ]; then
    node -e '
        const fs = require("fs");
        const locked = Object.keys(require("./skills-lock.json").skills);
        const missing = locked.filter(s => !fs.existsSync(".agents/skills/" + s + "/SKILL.md"));
        if (missing.length) console.log("skills in skills-lock.json but missing from .agents/skills: " + missing.join(" ") + ". Run: sh scripts/skills-install.sh");
    ' 2>/dev/null
fi

[ -f CONTEXT-MAP.md ] && echo "domain: multi-context, start at CONTEXT-MAP.md"
[ -f CONTEXT.md ] && echo "domain: glossary in CONTEXT.md"
[ -d docs/adr ] && echo "decisions: docs/adr ($(ls docs/adr | wc -l | tr -d ' ') ADRs)"
[ -f docs/agents/issue-tracker.md ] || echo "issue tracker: not configured. code-review, to-tickets and triage need docs/agents/issue-tracker.md (README, \"What each skill expects\")"
exit 0
