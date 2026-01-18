#!/usr/bin/env bash
# Update all external skill submodules from their upstream sources
# Usage: ./update-skills.sh [submodule-name]
#   With no args: updates all submodules
#   With arg: updates only the specified submodule

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

cd "$REPO_ROOT"

# Track update results
declare -a FAILED_UPDATES=()
declare -a SUCCESSFUL_UPDATES=()

update_submodule() {
    local submodule="$1"
    local submodule_path="apps/dot-claude/skills/external/$submodule"

    if [[ ! -d "$submodule_path" ]]; then
        echo "Error: Submodule '$submodule' not found at $submodule_path"
        FAILED_UPDATES+=("$submodule (not found)")
        return 1
    fi

    echo "Updating $submodule..."

    # Check for local changes that might cause merge conflicts
    if ! git -C "$submodule_path" diff --quiet 2>/dev/null; then
        echo "  Warning: $submodule has local changes, skipping to avoid conflicts"
        FAILED_UPDATES+=("$submodule (local changes)")
        return 1
    fi

    # Attempt the update and capture any errors
    if git submodule update --remote --merge "$submodule_path" 2>&1; then
        echo "  ✓ $submodule updated"
        SUCCESSFUL_UPDATES+=("$submodule")
    else
        echo "  ✗ $submodule failed to update"
        FAILED_UPDATES+=("$submodule (merge failed)")
        return 1
    fi
}

print_summary() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Update Summary"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    if [[ ${#SUCCESSFUL_UPDATES[@]} -gt 0 ]]; then
        echo ""
        echo "✓ Successfully updated (${#SUCCESSFUL_UPDATES[@]}):"
        for skill in "${SUCCESSFUL_UPDATES[@]}"; do
            echo "  - $skill"
        done
    fi

    if [[ ${#FAILED_UPDATES[@]} -gt 0 ]]; then
        echo ""
        echo "✗ Failed to update (${#FAILED_UPDATES[@]}):"
        for skill in "${FAILED_UPDATES[@]}"; do
            echo "  - $skill"
        done
        echo ""
        echo "To resolve merge conflicts manually:"
        echo "  cd apps/dot-claude/skills/external/<skill-name>"
        echo "  git fetch origin"
        echo "  git merge origin/main  # or origin/master"
        echo "  # resolve conflicts, then: git add . && git commit"
    fi

    echo ""
    echo "Review changes with: git diff --submodule"
    echo "Commit with: git add apps/dot-claude/skills/external && git commit -m 'chore: update external skills'"
}

if [[ $# -eq 0 ]]; then
    echo "Updating all external skill submodules..."
    echo ""

    # Initialize any uninitialized submodules first
    git submodule update --init --recursive apps/dot-claude/skills/external/

    # Update all submodules to their latest remote commits
    for dir in apps/dot-claude/skills/external/*/; do
        submodule_name=$(basename "$dir")
        # Don't exit on individual failures (handled by tracking)
        update_submodule "$submodule_name" || true
    done

    print_summary

    # Exit with error if any updates failed
    if [[ ${#FAILED_UPDATES[@]} -gt 0 ]]; then
        exit 1
    fi
else
    update_submodule "$1"
fi
