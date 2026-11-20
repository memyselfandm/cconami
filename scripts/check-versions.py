#!/usr/bin/env python3
# /// script
# requires-python = ">=3.9"
# ///
"""Fail when a plugin's shipped files changed but its version did not.

    python3 scripts/check-versions.py --base <ref> [--repo DIR]

Installs are pinned to the "version" in plugins/<p>/.claude-plugin/plugin.json,
so a change that ships without a version bump never reaches existing users.

Compares HEAD with the merge base of <ref> and HEAD. For each plugins/<p>/
with a changed file outside plugins/<p>/tests/, the version at HEAD must
differ from the version at the merge base. A plugin that is new, or deleted,
since the merge base is not checked.
Exit codes: 0 ok, 1 a plugin needs a version bump, 2 a git or JSON error.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path


def git(repo, *args):
    return subprocess.run(
        ["git", "-C", str(repo), *args], check=True, capture_output=True, text=True
    ).stdout


def version_at(repo, rev, plugin):
    """Return the plugin's version at rev, or None if plugin.json is absent there."""
    path = f"plugins/{plugin}/.claude-plugin/plugin.json"
    try:
        text = git(repo, "show", f"{rev}:{path}")
    except subprocess.CalledProcessError:
        return None
    return json.loads(text).get("version")


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--base", required=True, help="the branch the change merges into, e.g. origin/main")
    ap.add_argument("--repo", default=Path(__file__).resolve().parent.parent, type=Path)
    args = ap.parse_args(argv)

    try:
        merge_base = git(args.repo, "merge-base", args.base, "HEAD").strip()
        changed = git(args.repo, "diff", "--name-only", merge_base, "HEAD", "--", "plugins/").split()
    except subprocess.CalledProcessError as exc:
        print(f"error: git failed: {exc.stderr.strip()}", file=sys.stderr)
        return 2

    plugins = sorted({
        parts[1] for parts in (p.split("/") for p in changed)
        if len(parts) >= 3 and parts[2] != "tests"
    })
    errors = []
    try:
        for plugin in plugins:
            before = version_at(args.repo, merge_base, plugin)
            after = version_at(args.repo, "HEAD", plugin)
            if before is None or after is None:
                continue
            if before == after:
                errors.append(f"plugins/{plugin} changed but its version is still {after!r}; bump it in plugin.json")
    except ValueError as exc:
        print(f"error: unreadable plugin.json: {exc}", file=sys.stderr)
        return 2

    for line in errors:
        print(f"error: {line}", file=sys.stderr)
    if errors:
        return 1
    print(f"versions ok: {len(plugins)} changed plugin(s) bumped")
    return 0


if __name__ == "__main__":
    sys.exit(main())
