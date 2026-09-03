#!/bin/sh
# .githooks.sh
# This script copies the contents of the .githooks directory to the .git/hooks directory.

# Get the directory of the script and change to the parent directory
script_dir=$(cd -P -- "$(dirname -- "$0")" && pwd)
cd "$script_dir/.."

# Create the .git/hooks directory if it doesn't exist and copy the hooks
mkdir -pv .git/hooks
cp -v .githooks/* .git/hooks/