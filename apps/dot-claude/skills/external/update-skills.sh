#!/usr/bin/env bash
# Update all external skill submodules from their upstream sources
# Usage: ./update-skills.sh [submodule-name]
#   With no args: updates all submodules
#   With arg: updates only the specified submodule

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

cd "$REPO_ROOT"

update_submodule() {
    local submodule="$1"
    local submodule_path="apps/dot-claude/skills/external/$submodule"

    if [[ ! -d "$submodule_path" ]]; then
        echo "Error: Submodule '$submodule' not found at $submodule_path"
        return 1
    fi

    echo "Updating $submodule..."
    git submodule update --remote --merge "$submodule_path"
    echo "  ✓ $submodule updated"
}

if [[ $# -eq 0 ]]; then
    echo "Updating all external skill submodules..."
    echo ""

    # Initialize any uninitialized submodules first
    git submodule update --init --recursive apps/dot-claude/skills/external/

    # Update all submodules to their latest remote commits
    for dir in apps/dot-claude/skills/external/*/; do
        submodule_name=$(basename "$dir")
        update_submodule "$submodule_name"
    done

    echo ""
    echo "All skill submodules updated!"
    echo ""
    echo "Review changes with: git diff --submodule"
    echo "Commit with: git add apps/dot-claude/skills/external && git commit -m 'chore: update external skills'"
else
    update_submodule "$1"
fi
