#!/usr/bin/env bash
# Render every skill under the given roots into a Hermes skills directory.
#
#   platforms/hermes/install.sh [--dry-run] [--force] [--] <target-dir> [skills-root ...]
#
# Options come first. Everything after the target is a skills root, even if it
# looks like an option.
#
# <target-dir> is required and has no default, so nothing is written into a
# live Hermes install by accident. Point it at a scratch directory, or at a
# profile's skills/ directory when you mean to.
#
# With no skills roots, render.py searches plugins/*/skills in this repo
# (see render.py for what discovery skips).
#
# Pass 1 is a dry run: it validates every skill and supporting file, checks
# for name collisions and prints what would be written or replaced. Pass 2
# writes. An existing skill is replaced only with --force.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  echo "usage: $0 [--dry-run] [--force] [--] <target-dir> [skills-root ...]" >&2
  exit 1
}

dry_run=0
force=()
while [[ $# -gt 0 && "$1" == --* ]]; do
  case "$1" in
    --dry-run) dry_run=1 ;;
    --force) force=(--force) ;;
    --) shift; break ;;
    *) usage ;;
  esac
  shift
done
[[ $# -ge 1 ]] || usage
target="$1"
shift

if command -v uv >/dev/null 2>&1; then
  render=(uv run --quiet --script "$HERE/render.py")
else
  render=(python3 "$HERE/render.py")
fi

# ${force[@]+...} keeps an empty array safe under set -u on bash 3.2.
# "--" ends render.py's options, so a root such as "--force" or "-x" is a path.
"${render[@]}" --dry-run ${force[@]+"${force[@]}"} --all -- "$target" "$@"
if [[ $dry_run -eq 1 ]]; then
  exit 0
fi
"${render[@]}" ${force[@]+"${force[@]}"} --all -- "$target" "$@"
