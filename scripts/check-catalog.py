#!/usr/bin/env python3
# /// script
# requires-python = ">=3.9"
# ///
"""Check that the README plugin catalog matches the marketplace.

    python3 scripts/check-catalog.py [--repo DIR]

Three sources must name the same set of plugins:
  * the table under "## Plugins" in README.md, one row per plugin, the plugin
    name in backticks in the first cell;
  * the "plugins" list in .claude-plugin/marketplace.json;
  * the directories under plugins/ that hold .claude-plugin/plugin.json.

It also checks that each marketplace entry's source is ./plugins/<name> and
that no name appears twice in the table or the marketplace.
Exit codes: 0 consistent, 1 a mismatch, 2 a file is missing or unreadable.
"""
import argparse
import json
import re
import sys
from pathlib import Path

HEADING = "## Plugins"
NAME_CELL = re.compile(r"`([a-z0-9][a-z0-9-]*)`")


def readme_plugins(text):
    """Return the plugin names in the README table, in order, or None."""
    lines = text.splitlines()
    try:
        start = lines.index(HEADING)
    except ValueError:
        return None
    names, in_table = [], False
    for line in lines[start + 1:]:
        if line.startswith("## "):
            break
        if not line.startswith("|"):
            if in_table:
                break
            continue
        in_table = True
        first = line.strip("|").split("|")[0].strip()
        if not first or set(first) <= set("-: ") or first == "Plugin":
            continue
        match = NAME_CELL.search(first)
        names.append(match.group(1) if match else first)
    return names


def duplicates(names):
    seen, dup = set(), []
    for n in names:
        if n in seen and n not in dup:
            dup.append(n)
        seen.add(n)
    return dup


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--repo", default=Path(__file__).resolve().parent.parent, type=Path)
    args = ap.parse_args(argv)
    repo = args.repo

    try:
        readme = (repo / "README.md").read_text(encoding="utf-8")
        market = json.loads((repo / ".claude-plugin" / "marketplace.json").read_text(encoding="utf-8"))
        entries = market["plugins"]
        market_names = [e["name"] for e in entries]
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print(f"error: cannot read the catalog sources: {exc}", file=sys.stderr)
        return 2

    table = readme_plugins(readme)
    if table is None:
        print(f'error: README.md has no "{HEADING}" section', file=sys.stderr)
        return 1

    dirs = sorted(
        p.name for p in (repo / "plugins").iterdir()
        if (p / ".claude-plugin" / "plugin.json").is_file()
    ) if (repo / "plugins").is_dir() else []

    errors = []
    for name in duplicates(table):
        errors.append(f"README.md lists {name} more than once")
    for name in duplicates(market_names):
        errors.append(f"marketplace.json lists {name} more than once")
    for name in sorted(set(table) - set(market_names)):
        errors.append(f"{name} is in the README table but not in marketplace.json")
    for name in sorted(set(market_names) - set(table)):
        errors.append(f"{name} is in marketplace.json but not in the README table")
    for name in sorted(set(dirs) - set(market_names)):
        errors.append(f"plugins/{name} is not in marketplace.json")
    for entry in entries:
        want = f"./plugins/{entry['name']}"
        if entry.get("source") != want:
            errors.append(f"{entry['name']}: marketplace source is {entry.get('source')!r}, want {want!r}")
        elif entry["name"] not in dirs:
            errors.append(f"{entry['name']}: {want} has no .claude-plugin/plugin.json")

    for line in errors:
        print(f"error: {line}", file=sys.stderr)
    if errors:
        return 1
    print(f"catalog ok: {len(market_names)} plugins")
    return 0


if __name__ == "__main__":
    sys.exit(main())
