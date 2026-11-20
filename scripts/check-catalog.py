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

It also checks that:
  * no name appears twice in the table or the marketplace;
  * each marketplace entry's source is ./plugins/<name>;
  * each plugin.json "name" equals its directory name (and so the marketplace
    name);
  * each plugin.json dependency on this marketplace (a bare name,
    "name@<this marketplace>", or an object without another marketplace)
    names a plugin in the marketplace;
  * the README "Contents" cell (last column) states the plugin's skill and
    agent counts: "N skill(s)" must equal the number of skills/*/SKILL.md, and
    "N agent(s)" the number of agents/*.md. A count left out means zero.
Exit codes: 0 consistent, 1 a mismatch, 2 a file is missing or unreadable.
"""
import argparse
import json
import re
import sys
from pathlib import Path

HEADING = "## Plugins"
NAME_CELL = re.compile(r"`([a-z0-9][a-z0-9-]*)`")
COUNTS = {"skills": re.compile(r"(\d+)\s+skills?\b"), "agents": re.compile(r"(\d+)\s+agents?\b")}


def readme_rows(text):
    """Return [(name, contents_cell)] from the README table, or None."""
    lines = text.splitlines()
    try:
        start = lines.index(HEADING)
    except ValueError:
        return None
    rows, in_table = [], False
    for line in lines[start + 1:]:
        if line.startswith("## "):
            break
        if not line.startswith("|"):
            if in_table:
                break
            continue
        in_table = True
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        first = cells[0]
        if not first or set(first) <= set("-: ") or first == "Plugin":
            continue
        match = NAME_CELL.search(first)
        rows.append((match.group(1) if match else first, cells[-1]))
    return rows


def duplicates(names):
    seen, dup = set(), []
    for n in names:
        if n in seen and n not in dup:
            dup.append(n)
        seen.add(n)
    return dup


def local_dependency(dep, marketplace):
    """Return the plugin name a dependency names in this marketplace, else None."""
    if isinstance(dep, str):
        name, _, market = dep.partition("@")
    elif isinstance(dep, dict):
        name, market = dep.get("name", ""), dep.get("marketplace", "")
    else:
        return None
    return name if market in ("", marketplace) else None


def actual_counts(plugin_dir):
    return {
        "skills": len(list(plugin_dir.glob("skills/*/SKILL.md"))),
        "agents": len(list(plugin_dir.glob("agents/*.md"))),
    }


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--repo", default=Path(__file__).resolve().parent.parent, type=Path)
    args = ap.parse_args(argv)
    repo = args.repo

    try:
        readme = (repo / "README.md").read_text(encoding="utf-8")
        market = json.loads((repo / ".claude-plugin" / "marketplace.json").read_text(encoding="utf-8"))
        market_name = market.get("name", "")
        entries = market["plugins"]
        market_names = [e["name"] for e in entries]
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print(f"error: cannot read the catalog sources: {exc}", file=sys.stderr)
        return 2

    rows = readme_rows(readme)
    if rows is None:
        print(f'error: README.md has no "{HEADING}" section', file=sys.stderr)
        return 1
    table = [name for name, _ in rows]

    manifests = {}
    plugins_dir = repo / "plugins"
    if plugins_dir.is_dir():
        for p in sorted(plugins_dir.iterdir()):
            path = p / ".claude-plugin" / "plugin.json"
            if path.is_file():
                try:
                    manifests[p.name] = json.loads(path.read_text(encoding="utf-8"))
                except (OSError, ValueError) as exc:
                    print(f"error: cannot read {path}: {exc}", file=sys.stderr)
                    return 2
    dirs = sorted(manifests)

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

    for d, manifest in manifests.items():
        if manifest.get("name") != d:
            errors.append(f"plugins/{d}: plugin.json name is {manifest.get('name')!r}, want {d!r}")
        for dep in manifest.get("dependencies", []):
            name = local_dependency(dep, market_name)
            if name is not None and name not in market_names:
                errors.append(f"plugins/{d}: dependency {name!r} is not in marketplace.json")

    for name, contents in rows:
        if name not in manifests:
            continue
        actual = actual_counts(plugins_dir / name)
        for kind, pattern in COUNTS.items():
            match = pattern.search(contents)
            stated = int(match.group(1)) if match else 0
            if stated != actual[kind]:
                errors.append(f"{name}: README says {stated} {kind}, plugins/{name} has {actual[kind]}")

    for line in errors:
        print(f"error: {line}", file=sys.stderr)
    if errors:
        return 1
    print(f"catalog ok: {len(market_names)} plugins")
    return 0


if __name__ == "__main__":
    sys.exit(main())
