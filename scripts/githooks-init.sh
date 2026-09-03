#!/bin/sh
# .githooks.sh
# This script copies the contents of the .githooks directory to the .git/hooks directory.
set -e

# Get the directory of the script and change to its parent (repo root)
script_dir=$(cd -P -- "$(dirname -- "$0")" && pwd)
cd "$(dirname -- "$script_dir")"

# Create the .git/hooks directory if it doesn't exist
mkdir -pv .git/hooks

# Copy the hooks, stripping the .sh extension (post-merge.sh -> post-merge)
for hook in .githooks/*; do
    [ -f "$hook" ] || continue
    name=$(basename -- "$hook" .sh)
    cp -v "$hook" ".git/hooks/$name"
    chmod +x ".git/hooks/$name"
done

echo "Git hooks installed successfully!"
