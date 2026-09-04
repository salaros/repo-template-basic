#!/bin/sh
# scripts/on-manifest-change.sh
# Reads changed file paths on stdin (one per line, repo-relative) and runs the restore command of
# every row in scripts/stacks.tsv whose trigger patterns match one of them, provided the row's
# "needs" file exists at the repo root. The post-merge Git hook pipes `git diff-tree` output into
# it; the harness suite pipes fixtures with --dry-run.
# Usage: sh scripts/on-manifest-change.sh [--dry-run] < changed-paths
#   --dry-run  print "would run: <command>" per matching row instead of running it
script_dir=$(cd -P -- "$(dirname -- "$0")" && pwd)
cd "$(dirname -- "$script_dir")" || exit 1
dry=""
[ "$1" = "--dry-run" ] && dry=1
changed=$(cat)
[ -n "$changed" ] || { [ -n "$dry" ] && echo "nothing to restore"; exit 0; }

# True when any changed path matches one of the space-separated patterns ($1), by full path or basename.
matches() {
    for pat in $1; do
        printf '%s\n' "$changed" | {
            while IFS= read -r p; do
                case "$p" in $pat|*/$pat) exit 0 ;; esac
            done
            exit 1
        } && return 0
    done
    return 1
}

status=0
ran=""
tab=$(printf '\t')
while IFS="$tab" read -r stack triggers needs restore scaffold; do
    case "$stack" in ''|'#'*) continue ;; esac
    [ "$restore" != "-" ] || continue
    matches "$triggers" || continue
    [ "$needs" = "-" ] || [ -e "$needs" ] || continue
    ran=1
    if [ -n "$dry" ]; then
        echo "would run: $restore ($stack)"
    else
        echo "$stack manifests changed: running $restore"
        sh -c "$restore" || { echo "$restore failed" >&2; status=1; }
    fi
done < scripts/stacks.tsv
[ -n "$ran" ] || [ -z "$dry" ] || echo "nothing to restore"
exit $status
