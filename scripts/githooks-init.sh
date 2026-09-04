#!/bin/sh
# scripts/githooks-init.sh
# Points Git at the committed hooks in .githooks/ (core.hooksPath), so this clone runs them and
# picks up every change to them on pull; nothing is copied. Run once per clone.
# Usage: sh scripts/githooks-init.sh
script_dir=$(cd -P -- "$(dirname -- "$0")" && pwd)
cd "$(dirname -- "$script_dir")" || exit 1
git config core.hooksPath .githooks || exit 1
echo "Git hooks: core.hooksPath = .githooks ($(ls .githooks | tr '\n' ' '))"
