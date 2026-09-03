#!/bin/sh
# .git/hooks/post-merge
# This script is executed after a successful merge in Git. 
# It checks for changes in specific files and runs corresponding commands to update dependencies or perform other necessary actions.

# --- Safety check
if [ -z "$GIT_DIR" ]; then
	echo "Don't run this script from the command line." >&2
	echo " (if you want, you could supply GIT_DIR then run" >&2
	echo "  $0 <ref> <oldrev> <newrev>)" >&2
	exit 1
fi

# Change to the root of the Git repository to ensure that commands are run in the correct context
cd "$(dirname "${GIT_DIR:-$(git rev-parse --git-dir)}")" || exit 1

# Get the list of changed files between the previous commit (ORIG_HEAD) and the current commit (HEAD)
changed=$(git diff-tree -r --name-only --no-commit-id ORIG_HEAD HEAD)

# Function to check if a specific file has changed
file_changed() {
    # $1: basename regex, anchored so "my-package.json.bak" doesn't match
    printf '%s\n' "$changed" | grep -qE "(^|/)$1\$"
}

# Check if package.json has changed and set a flag accordingly
pkg_changed=false
file_changed 'package\.json' && pkg_changed=true

# Function to determine if a package manager's lock file has changed or if package.json has changed while the lock file exists
needs_install() {
    # $1: lock file name
    # Lock file changed, OR package.json changed and lock file exists locally (possibly untracked)
    lock_re=$(printf '%s' "$1" | sed 's/\./\\./g')
    file_changed "$lock_re" && return 0
    [ "$pkg_changed" = true ] && [ -f "$1" ] && return 0
    return 1
}

# Check for changes in specific files and run corresponding commands

# Check if skills.json has changed and run the skills update command
if file_changed 'skills\.json'; then
    echo "skills.json changed. Running npx skills update..."
    npx skills update
fi

# Check if package-lock.json has changed or if package.json has changed while package-lock.json exists, and run npm install
if needs_install package-lock.json; then
    echo "npm dependencies changed. Running npm install..."
    npm install
fi

# Check if pnpm-lock.yaml has changed or if package.json has changed while pnpm-lock.yaml exists, and run pnpm install
if needs_install pnpm-lock.yaml; then
    echo "pnpm dependencies changed. Running pnpm install..."
    pnpm install
fi

# Check if yarn.lock has changed or if package.json has changed while yarn.lock exists, and run yarn install
if needs_install yarn.lock; then
    echo "yarn dependencies changed. Running yarn install..."
    yarn install
fi

# Check if NuGet dependencies have changed by looking for changes
# in project files that reference packages
nuget_changed() {
    # Any added/removed line in project/props files that touches a package reference
    git diff ORIG_HEAD HEAD -- \
    '*.csproj' '*.fsproj' '*.vbproj' '*.props' '*.targets' \
    | grep -qE '^[+-][^+-].*<(PackageReference|PackageVersion|GlobalPackageReference|PackageDownload)\b'
}

# Check if NuGet dependencies have changed or if specific NuGet-related
# files have changed and run dotnet restore
if nuget_changed || file_changed 'packages\.lock\.json' || file_changed 'nuget\.config' || file_changed 'global\.json'; then
    echo "NuGet dependencies changed. Running dotnet restore..."
    dotnet restore
fi