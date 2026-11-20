#!/usr/bin/env python3
# /// script
# requires-python = ">=3.9"
# dependencies = ["pyyaml>=6"]
# ///
"""Lint SKILL.md files for the cross-platform rule.

    uv run --script scripts/lint-skills.py [--base DIR] [--allowlist FILE] [skills-root ...]

Two checks per SKILL.md:
  * The frontmatter passes the same validation the Hermes renderer applies
    (platforms/hermes/render.py is imported, so there is one rule set).
  * The body, which is written agent-neutral, names no platform-specific tool.
    Those names belong in platforms/<platform>.md beside it, which is not read.

Skills are found by render.py's discovery, under the given roots (relative to
--base) or, by default, apps/dot-claude/skills and plugins/*/skills.

A forbidden name listed in lint-skills.allowlist is a warning instead of an
error. An allowlist entry that no longer matches anything is an error.
Exit codes: 0 clean or warnings only, 1 any error, 2 bad usage.
"""
import argparse
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.dont_write_bytecode = True  # no __pycache__ next to render.py
sys.path.insert(0, str(REPO / "platforms" / "hermes"))
import render  # noqa: E402  (platforms/hermes/render.py)

# Platform-specific names a SKILL.md body must not contain. Plain substrings.
# Add a new name here; nothing else needs to change.
FORBIDDEN = (
    "linctl",             # Linear CLI, Claude Code side
    "mcp__",              # MCP tool names, e.g. mcp__claude_ai_Linear__get_issue
    "/oh-my-claudecode:", # oh-my-claudecode skill invocations
    "hermes -p",          # Hermes profile CLI
    "kanban_create",      # Hermes kanban tool
)


def load_allowlist(path):
    """Return {(path, pattern): line_no}. Raises ValueError on a malformed line."""
    entries = {}
    if not path.is_file():
        return entries
    for n, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split(None, 1)
        if len(parts) != 2 or parts[1].strip() not in FORBIDDEN:
            raise ValueError(f"{path}:{n}: want '<path> <pattern>' with a pattern from FORBIDDEN")
        entries[(parts[0], parts[1].strip())] = n
    return entries


def lint_file(path):
    """Yield (kind, line_no, message, pattern) for one SKILL.md."""
    try:
        text = render.read_skill_md(path)
        fm_text, _, body = render.split_frontmatter(text)
    except render.SkillError as exc:
        yield "error", exc.line, str(exc), None
        return
    try:
        _, _, _, warnings = render.hermes_frontmatter(render.parse_frontmatter(fm_text))
        for w in warnings:
            yield "warning", 1, w, None
    except render.SkillError as exc:
        yield "error", exc.line, str(exc), None
    first_body_line = len(fm_text.splitlines()) + 3
    for offset, line in enumerate(body.splitlines()):
        for pattern in FORBIDDEN:
            if pattern in line:
                yield (
                    "error", first_body_line + offset,
                    f"body names '{pattern}'; move it to platforms/<platform>.md", pattern,
                )


def main(argv):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--base", type=Path, default=REPO, help="paths are reported relative to this")
    ap.add_argument("--allowlist", type=Path, default=REPO / "scripts" / "lint-skills.allowlist")
    ap.add_argument("roots", nargs="*", help="skills roots or globs, relative to --base")
    args = ap.parse_args(argv)

    base = args.base.resolve()
    try:
        allow = load_allowlist(args.allowlist)
    except ValueError as exc:
        print(f"error: {exc}")
        return 1
    if args.roots:
        roots = [d for r in args.roots for d in sorted(base.glob(r)) if d.is_dir()]
    else:
        roots = render.default_roots(base)
    skill_dirs, discovery_errors = render.discover(roots)

    def rel(p):
        p = Path(p)
        return str(p.relative_to(base)) if p.is_relative_to(base) else str(p)

    errors = warnings = 0
    for message in discovery_errors:
        errors += 1
        print(f"error: {message}")
    if not skill_dirs and not discovery_errors:
        print("error: no SKILL.md files found")
        return 1

    used = set()
    for skill_dir in skill_dirs:
        display = rel(skill_dir / "SKILL.md")
        for kind, line_no, message, pattern in lint_file(skill_dir / "SKILL.md"):
            if pattern is not None and (display, pattern) in allow:
                used.add((display, pattern))
                kind, message = "warning", message + " (allowlisted)"
            if kind == "error":
                errors += 1
            else:
                warnings += 1
            print(f"{kind}: {display}:{line_no}: {message}")
    for (display, pattern), n in sorted(allow.items()):
        if (display, pattern) not in used:
            errors += 1
            print(f"error: {args.allowlist.name}:{n}: stale entry, remove it: {display} {pattern}")

    print(f"lint-skills: {len(skill_dirs)} files, {errors} errors, {warnings} warnings")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
