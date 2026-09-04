#!/bin/sh
# .agents/hooks/test.sh
# Runs the hook suite: every line of tests/cases.tsv is "<hook> <fixture> <expected exit> <note>".
# The fixture is piped to the hook as its payload with __ROOT__ replaced by this checkout, so the
# same fixtures work on any machine. Prints one FAIL line per mismatch and exits 1 if any.
# Usage: sh .agents/hooks/test.sh
dir=$(cd -P -- "$(dirname -- "$0")" && pwd)
cd "$dir/../.." || exit 1
root=$(pwd)
export HOOK_TEST=1
unset CLAUDE_PROJECT_DIR CURSOR_PROJECT_DIR GEMINI_PROJECT_DIR

# The bad-doc case needs a chain document with a wrong heading; it exists only while that case runs.
bad_doc=docs/brd/9999-hook-test.md
made_dir=""
plant() { [ -d docs/brd ] || { mkdir -p docs/brd; made_dir=docs/brd; }; printf '# Wrong heading\n' > "$bad_doc"; }
cleanup() { rm -f "$bad_doc"; [ -n "$made_dir" ] && rmdir "$made_dir" 2>/dev/null; made_dir=""; }
trap cleanup EXIT

pass=0; fail=0
tab=$(printf '\t')
while IFS="$tab" read -r hook fixture expect note; do
    case "$hook" in ''|'#'*) continue ;; esac
    [ "$fixture" = claude-bad-doc.json ] && plant
    out=$(sed "s#__ROOT__#$root#g" ".agents/hooks/tests/$fixture" | sh ".agents/hooks/$hook" 2>&1)
    got=$?
    cleanup
    if [ "$got" = "$expect" ]; then
        pass=$((pass + 1))
    else
        fail=$((fail + 1))
        echo "FAIL $hook < $fixture: exit $got, expected $expect ($note)"
        printf '%s\n' "$out" | sed 's/^/    /'
    fi
done < .agents/hooks/tests/cases.tsv

# The roster must be consistent too: every skill routed, README table current.
out=$(node scripts/skills.js check 2>&1)
if [ $? -eq 0 ]; then
    pass=$((pass + 1))
else
    fail=$((fail + 1))
    echo "FAIL node scripts/skills.js check"
    printf '%s\n' "$out" | sed 's/^/    /'
fi

echo "hook tests: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
