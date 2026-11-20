#!/usr/bin/env python3
# /// script
# requires-python = ">=3.9"
# dependencies = ["pyyaml>=6"]
# ///
"""Render canonical skills into the Hermes skill layout.

    render.py [--dry-run] [--force] <skill-dir> <out-root>
    render.py [--dry-run] [--force] --all <out-root> [skills-root ...]

Writes <out-root>/<category>/<name>/SKILL.md plus the skill's supporting files.
With --all it renders every skill found under the roots (default:
apps/dot-claude/skills and plugins/*/skills in this repo). Every skill and
every supporting file is validated before anything is written.

Frontmatter (scripts/lint-skills.py applies the same rules by importing this):
  * Kept: name, description, version, author, license.
  * `name` and metadata.hermes.category become path parts, so both must match
    ^[a-z0-9][a-z0-9-]{0,63}$. The category defaults to "general".
  * `targets` lists the agents a skill supports, e.g. [claude-code, hermes];
    absent means all. A skill whose list omits "hermes" is skipped. Not copied.
  * Hermes reads `platforms` as an OS filter, so a source `platforms` and
    metadata.hermes.os may list only linux, macos, windows. The output
    `platforms` comes only from metadata.hermes.os.
  * metadata.hermes passes through tags and related_skills; other keys are
    dropped with a warning. Every other top-level key is Claude Code only and
    is dropped.
  * YAML aliases are rejected. The frontmatter, as written and as rendered,
    is capped at 64 KiB.

Files: the body is copied byte for byte, with one exception: a line whose only
content is a link to another platform's notes file (platforms/<other>.md, not
hermes.md) is dropped, because that file is not copied and the link would
dangle. Both styles in use match, with the line ending dropped too:
`- [platforms/claude-code.md](platforms/claude-code.md)` and
`- Claude Code: [platforms/claude-code.md](platforms/claude-code.md)`. Lines
inside fenced code blocks are never touched, and every other line keeps its
exact bytes, CRLF and a missing final newline included. platforms/hermes.md is
copied, other files under platforms/ are not. Every other file is copied with mode 0644, or
0755 when the owner-exec bit is set. Hidden files, __pycache__ and
node_modules are ignored. Symlinks are skipped with a warning. A hardlinked or
special file (FIFO, device, socket) is an error, and so is a file that cannot
be opened for reading; the dry run opens every file to prove it.

Every skill is built in a temporary directory under <out-root>/.hermes-dist
first, and only when all builds succeed are they moved into place. A replaced
skill is kept in .hermes-dist/<name>.old-* until the new one is in place, then
deleted; if that delete fails, a warning names the directory to remove by
hand. Hermes reserves .hermes-dist and never loads skills from it.

An existing <category>/<name> (including a dangling symlink) is replaced only
with --force; a dry run prints "would replace:" for it. Put "--" before the
paths when any of them may start with "-".

Exit codes: 0 ok, 1 usage, 2 invalid skill, 3 would replace without --force.
"""
import argparse
import os
import re
import shutil
import stat
import sys
import tempfile
from pathlib import Path

import yaml

REPO = Path(__file__).resolve().parents[2]
DEFAULT_ROOTS = ("apps/dot-claude/skills", "plugins/*/skills")
TOP_LEVEL_KEYS = ("name", "description", "version", "author", "license")
HERMES_PASSTHROUGH = ("tags", "related_skills")
OS_NAMES = ("linux", "macos", "windows")
SLUG = re.compile(r"[a-z0-9][a-z0-9-]{0,63}")
MAX_FRONTMATTER = 64 * 1024
PLATFORM_FILE = Path("platforms") / "hermes.md"
PRUNED_DIRS = ("__pycache__", "node_modules")
# A list item (or bare line) whose only content is a link to platforms/<x>.md,
# optionally after a short "Label:" prefix.
PLATFORM_LINK_LINE = re.compile(
    r"[ \t]*(?:[-*+][ \t]+)?(?:[^\[\]()\n]*?:[ \t]*)?"
    r"\[[^\]\n]*\]\((?:\./)?platforms/([^/()\s]+)\.md\)[ \t]*"
)
FENCE = re.compile(r"[ \t]{0,3}(```|~~~)")


class SkillError(Exception):
    def __init__(self, message, line=1):
        super().__init__(message)
        self.line = line


class Refused(Exception):
    """An existing destination would be replaced without --force."""


def short(value):
    """Describe a parsed YAML value without echoing it at length."""
    if isinstance(value, str):
        return repr(value[:40]) + ("..." if len(value) > 40 else "")
    return type(value).__name__


def warn(message):
    print(f"warning: {message}", file=sys.stderr)


class FrontmatterDumper(yaml.SafeDumper):
    """Block mappings, inline lists: `platforms: [linux]`, as Hermes skills write them."""


FrontmatterDumper.add_representer(
    list, lambda d, v: d.represent_sequence("tag:yaml.org,2002:seq", v, flow_style=True)
)


# --- reading and validation ---------------------------------------------------


def _check_mode(st):
    if stat.S_ISLNK(st.st_mode):
        raise SkillError("is a symlink")
    if not stat.S_ISREG(st.st_mode):
        raise SkillError("is not a regular file")
    if st.st_nlink > 1:
        raise SkillError(f"is a hardlink ({st.st_nlink} links)")


def check_regular_file(path):
    """Return lstat of path; raise unless it is a single-link regular file."""
    st = os.lstat(path)
    _check_mode(st)
    return st


def open_regular(path):
    """Open path for binary reading, refusing symlinks, hardlinks and special files.

    The checks run on the open descriptor, so the file cannot be swapped
    between the check and the read. O_NONBLOCK keeps a FIFO from hanging the open.
    """
    try:
        fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | getattr(os, "O_NONBLOCK", 0))
    except OSError as exc:
        if os.path.islink(path):
            raise SkillError("is a symlink") from None
        raise SkillError(f"cannot open ({exc.strerror})") from None
    try:
        _check_mode(os.fstat(fd))
    except SkillError:
        os.close(fd)
        raise
    return os.fdopen(fd, "rb")


def read_skill_md(path):
    """Read SKILL.md as text, keeping its exact bytes and line endings."""
    with open_regular(path) as fh:
        raw = fh.read()
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        raise SkillError("is not UTF-8") from None


def split_frontmatter(text):
    """Return (frontmatter_text, closing_fence_line, body).

    The fence lines must be exactly '---' plus a line ending. The body is
    everything after the closing fence line, unchanged.
    """
    lines = text.splitlines(keepends=True)
    if not lines or lines[0].rstrip("\r\n") != "---":
        raise SkillError("file does not start with a '---' frontmatter line")
    for i in range(1, len(lines)):
        if lines[i].rstrip("\r\n") == "---":
            fm_text = "".join(lines[1:i])
            if len(fm_text.encode("utf-8")) > MAX_FRONTMATTER:
                raise SkillError(f"frontmatter is larger than {MAX_FRONTMATTER} bytes")
            return fm_text, lines[i], "".join(lines[i + 1 :])
    raise SkillError("frontmatter has no closing '---' line")


class NoAliasLoader(yaml.SafeLoader):
    """SafeLoader that rejects aliases.

    An alias is cheap to parse but is written out in full on dump, so a 64 KB
    frontmatter could otherwise expand into hundreds of megabytes.
    """

    def compose_node(self, parent, index):
        if self.check_event(yaml.AliasEvent):
            line = self.peek_event().start_mark.line + 2
            raise SkillError("YAML aliases are not allowed", line)
        return super().compose_node(parent, index)


def parse_frontmatter(fm_text):
    if len(fm_text.encode("utf-8")) > MAX_FRONTMATTER:
        raise SkillError(f"frontmatter is larger than {MAX_FRONTMATTER} bytes")
    try:
        data = yaml.load(fm_text, Loader=NoAliasLoader)  # noqa: S506 (SafeLoader subclass)
    except RecursionError:
        raise SkillError("frontmatter is nested too deeply") from None
    except yaml.YAMLError as exc:
        mark = getattr(exc, "problem_mark", None)
        problem = str(getattr(exc, "problem", None) or "parse error")[:80]
        line = mark.line + 2 if mark else 1
        raise SkillError(f"frontmatter is not valid YAML ({problem})", line) from None
    if not isinstance(data, dict):
        raise SkillError(f"frontmatter is not a YAML mapping (got {short(data)})")
    return data


def _str_list(value, label, allowed=None):
    if not isinstance(value, list) or not all(isinstance(v, str) for v in value):
        raise SkillError(f"'{label}' must be a list of strings (got {short(value)})")
    if allowed is not None and any(v not in allowed for v in value):
        raise SkillError(
            f"'{label}' must list only {', '.join(allowed)}; use `targets` for agents"
        )
    return value


def _slug(value, label):
    if not isinstance(value, str) or not SLUG.fullmatch(value):
        raise SkillError(
            f"'{label}' must match ^[a-z0-9][a-z0-9-]{{0,63}}$ (got {short(value)})"
        )
    return value


def hermes_frontmatter(data):
    """Validate a parsed frontmatter and map it for Hermes.

    Returns (category, frontmatter, skip_reason, warnings). skip_reason is None
    unless `targets` excludes hermes. Every rule runs even for a skipped skill.
    """
    warnings = []
    _slug(data.get("name"), "name")
    desc = data.get("description")
    if not isinstance(desc, str) or not desc.strip():
        raise SkillError("frontmatter is missing 'description'")
    if "version" in data and (
        isinstance(data["version"], bool) or not isinstance(data["version"], (str, int, float))
    ):
        raise SkillError(f"'version' must be a string or number (got {short(data['version'])})")
    for key in ("author", "license"):
        if key in data and not isinstance(data[key], str):
            raise SkillError(f"'{key}' must be a string (got {short(data[key])})")
    if "platforms" in data:
        _str_list(data["platforms"], "platforms", OS_NAMES)
    targets = data.get("targets")
    if targets is not None:
        _str_list(targets, "targets")

    meta = data.get("metadata", {})
    if not isinstance(meta, dict):
        raise SkillError(f"'metadata' must be a mapping (got {short(meta)})")
    hermes = meta.get("hermes", {})
    if not isinstance(hermes, dict):
        raise SkillError(f"'metadata.hermes' must be a mapping (got {short(hermes)})")
    category = _slug(hermes.get("category", "general"), "metadata.hermes.category")
    out = {k: data[k] for k in TOP_LEVEL_KEYS if k in data}
    if "os" in hermes:
        out["platforms"] = _str_list(hermes["os"], "metadata.hermes.os", OS_NAMES)
    passthrough = {}
    for key, value in hermes.items():
        if key in HERMES_PASSTHROUGH:
            passthrough[key] = _str_list(value, f"metadata.hermes.{key}")
        elif key not in ("category", "os"):
            warnings.append(f"dropping unknown key metadata.hermes.{short(key)}")
    if passthrough:
        out["metadata"] = {"hermes": passthrough}

    skip = None
    if targets is not None and "hermes" not in targets:
        skip = "targets excludes hermes"
    return category, out, skip, warnings


# --- discovery ----------------------------------------------------------------


def discover(roots):
    """Return (skill_dirs, errors) for every SKILL.md under the roots.

    Not searched: hidden directories, __pycache__, node_modules, any
    platforms/ or external/ directory, and docs/archive/. A SKILL.md that is a
    symlink is an error, never a silent skip.
    """
    found, errors = set(), []
    for root in roots:
        root = Path(root)
        if not root.is_dir():
            errors.append(f"{root}: not a directory")
            continue
        for here, dirs, files in os.walk(root, followlinks=False):
            here = Path(here)
            dirs[:] = sorted(
                d for d in dirs
                if not d.startswith(".")
                and d not in PRUNED_DIRS + ("platforms", "external")
                and not (d == "archive" and here.name == "docs")
            )
            if "SKILL.md" in files:
                skill_md = here / "SKILL.md"
                if skill_md.is_symlink():
                    errors.append(f"{skill_md}: is a symlink; skills must be real files")
                else:
                    found.add(here)
    return sorted(found), errors


def default_roots(base):
    roots = []
    for pattern in DEFAULT_ROOTS:
        roots.extend(p for p in sorted(base.glob(pattern)) if p.is_dir())
    return roots


# --- rendering ----------------------------------------------------------------


def plan_files(skill_dir):
    """Return [(src, rel, executable)] for the supporting files, all validated."""
    planned = []
    for here, dirs, files in os.walk(skill_dir, followlinks=False):
        here = Path(here)
        keep = []
        for d in sorted(dirs):
            path = here / d
            if d.startswith(".") or d in PRUNED_DIRS:
                continue
            if path.is_symlink():
                warn(f"skipping symlink {path}")
                continue
            keep.append(d)
        dirs[:] = keep
        for name in sorted(files):
            path = here / name
            rel = path.relative_to(skill_dir)
            if rel == Path("SKILL.md") or name.startswith("."):
                continue
            if rel.parts[0] == "platforms" and rel != PLATFORM_FILE:
                continue
            if path.is_symlink():
                warn(f"skipping symlink {path}")
                continue
            try:
                st = check_regular_file(path)
                with open_regular(path):  # proves the real run can read it
                    pass
            except SkillError as exc:
                raise SkillError(f"{path}: {exc}") from None
            planned.append((path, rel, bool(st.st_mode & stat.S_IXUSR)))
    return planned


def drop_foreign_platform_links(body):
    """Drop lines that only link another platform's notes file.

    Every other line is returned byte for byte. Fenced code blocks are skipped.
    """
    out, fence = [], None
    for line in re.findall(r"[^\n]*\n|[^\n]+", body):
        text = line.rstrip("\r\n")
        m = FENCE.match(text)
        if m and fence in (None, m.group(1)):
            fence = None if fence else m.group(1)
        elif fence is None:
            m = PLATFORM_LINK_LINE.fullmatch(text)
            if m and m.group(1) != "hermes":
                continue
        out.append(line)
    return "".join(out)


def prepare(skill_dir):
    """Validate one skill. Returns a plan dict, or None if it is skipped."""
    skill_md = Path(skill_dir) / "SKILL.md"
    if not os.path.lexists(skill_md):
        raise SkillError(f"{skill_md}: not found")
    try:
        text = read_skill_md(skill_md)
        fm_text, fence, body = split_frontmatter(text)
        category, fm, skip, warnings = hermes_frontmatter(parse_frontmatter(fm_text))
    except SkillError as exc:
        raise SkillError(f"{skill_md}: {exc}", exc.line) from None
    for w in warnings:
        warn(f"{skill_md}: {w}")
    if skip:
        print(f"skip: {skill_md}: {skip}", file=sys.stderr)
        return None
    dumped = yaml.dump(
        fm, Dumper=FrontmatterDumper, sort_keys=False,
        allow_unicode=True, default_flow_style=False, width=10000,
    )
    if len(dumped.encode("utf-8")) > MAX_FRONTMATTER:
        raise SkillError(f"{skill_md}: rendered frontmatter is larger than {MAX_FRONTMATTER} bytes")
    return {
        "src": Path(skill_dir),
        "category": category,
        "name": fm["name"],
        "frontmatter": dumped,
        "fence": fence,
        "body": drop_foreign_platform_links(body),
        "files": plan_files(Path(skill_dir)),
    }


def staging_dir(dest):
    """<out-root>/.hermes-dist: Hermes reserves this name for staged and
    set-aside skill copies and never loads skills from it, so a leftover
    temp or old copy cannot show up as a duplicate skill. It sits under the
    same out-root as dest, so os.replace stays a same-filesystem rename.
    """
    out_root = dest.parent.parent
    out_root.mkdir(parents=True, exist_ok=True)
    stage = out_root / ".hermes-dist"
    try:
        os.mkdir(stage, 0o700)
    except FileExistsError:
        pass
    check_staging(out_root)
    return stage


def check_staging(out_root):
    """Refuse a .hermes-dist that is a symlink, a file, or someone else's.

    Following a symlinked staging dir would put temp builds and old copies
    outside the out-root. A missing one is fine; it is created on write.
    """
    stage = Path(out_root) / ".hermes-dist"
    try:
        st = os.lstat(stage)
    except FileNotFoundError:
        return
    if not stat.S_ISDIR(st.st_mode) or st.st_uid != os.geteuid():
        raise SkillError(
            f"{stage}: must be a real directory owned by you, not a symlink or file"
        )


def build_skill(plan, dest):
    """Build the skill in a staging temp dir and return its path.

    On any failure the temp dir is removed and dest is untouched.
    """
    stage = staging_dir(dest)  # checked before the category dir is created
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = Path(tempfile.mkdtemp(prefix=f"{dest.name}.tmp-", dir=stage))
    try:
        os.chmod(tmp, 0o755)
        with open(tmp / "SKILL.md", "w", encoding="utf-8", newline="") as fh:
            fh.write(f"---\n{plan['frontmatter']}{plan['fence']}{plan['body']}")
        os.chmod(tmp / "SKILL.md", 0o644)
        for src, rel, executable in plan["files"]:
            target = tmp / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            try:
                # Re-checked on the descriptor: the tree may have changed since planning.
                with open_regular(src) as fin, open(target, "xb") as fout:
                    shutil.copyfileobj(fin, fout)
            except SkillError as exc:
                raise SkillError(f"{src}: {exc}") from None
            os.chmod(target, 0o755 if executable else 0o644)
    except BaseException:
        shutil.rmtree(tmp, ignore_errors=True)
        raise
    return tmp


def install_built(tmp, dest):
    """Move a built temp dir to dest, replacing whatever is there (even a dangling symlink)."""
    if not os.path.lexists(dest):
        os.replace(tmp, dest)
        return
    old = Path(tempfile.mkdtemp(prefix=f"{dest.name}.old-", dir=staging_dir(dest)))
    os.replace(dest, old / dest.name)
    try:
        os.replace(tmp, dest)
    except OSError:
        os.replace(old / dest.name, dest)
        raise
    try:
        shutil.rmtree(old)
    except OSError as exc:
        warn(f"could not remove {old} ({exc.strerror}); it holds the previous {dest.name}, delete it by hand")


def write_skill(plan, dest):
    """Build one skill, then move it into place."""
    install_built(build_skill(plan, dest), dest)


def render_skills(skill_dirs, out_root, dry_run=False, force=False):
    """Validate every skill, then (unless dry_run) write them."""
    plans, seen = [], {}
    for skill_dir in skill_dirs:
        plan = prepare(skill_dir)
        if plan is None:
            continue
        dest = Path(out_root) / plan["category"] / plan["name"]
        if dest in seen:
            raise SkillError(f"two skills render to {dest}: {seen[dest]} and {skill_dir}")
        seen[dest] = skill_dir
        plans.append((plan, dest))
    check_staging(out_root)  # before anything is written, in the dry run too
    replacing = [dest for _, dest in plans if os.path.lexists(dest)]
    for plan, dest in plans:
        verb = "replace" if dest in replacing else "write"
        if dry_run:
            print(f"would {verb}: {dest / 'SKILL.md'}")
    if dry_run:
        return
    if replacing and not force:
        raise Refused(
            "refusing to replace without --force: " + ", ".join(str(d) for d in replacing)
        )
    try:
        # Build every skill first, so a failure in any one leaves all of dest untouched.
        built = []
        try:
            for plan, dest in plans:
                built.append((build_skill(plan, dest), dest))
        except BaseException:
            for tmp, _ in built:
                shutil.rmtree(tmp, ignore_errors=True)
            raise
        for i, (tmp, dest) in enumerate(built):
            try:
                install_built(tmp, dest)
            except BaseException:
                for rest, _ in built[i:]:
                    shutil.rmtree(rest, ignore_errors=True)
                raise
            print(f"wrote: {dest / 'SKILL.md'}")
    finally:
        try:
            os.rmdir(Path(out_root) / ".hermes-dist")  # only if empty
        except OSError:
            pass


def main(argv):
    ap = argparse.ArgumentParser(
        usage="render.py [--dry-run] [--force] (<skill-dir> <out-root> | --all <out-root> [root ...])"
    )
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--force", action="store_true", help="replace existing skills")
    ap.add_argument("--all", action="store_true", help="render every skill under the roots")
    ap.add_argument("paths", nargs="*")
    try:
        args = ap.parse_args(argv)
    except SystemExit:
        return 1
    try:
        if args.all:
            if not args.paths:
                ap.print_usage(sys.stderr)
                return 1
            out_root = Path(args.paths[0])
            roots = [Path(p) for p in args.paths[1:]] or default_roots(REPO)
            skill_dirs, errors = discover(roots)
            if errors:
                raise SkillError("\n  ".join(["discovery failed:"] + errors))
            if not skill_dirs:
                raise SkillError("no SKILL.md found under: " + " ".join(map(str, roots)))
        else:
            if len(args.paths) != 2:
                ap.print_usage(sys.stderr)
                return 1
            skill_dirs, out_root = [Path(args.paths[0])], Path(args.paths[1])
        render_skills(skill_dirs, out_root, dry_run=args.dry_run, force=args.force)
    except SkillError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    except Refused as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 3
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
