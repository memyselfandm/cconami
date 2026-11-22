// Pure logic for omc-launcher: frontmatter and argument-hint parsing, JSONC
// config reading, OMC install discovery, and command assembly. Nothing here
// touches the engine, so every rule is tested directly.

import type { Field, Skill } from '../types'

/** The OMC plugin's key in installed_plugins.json. */
export const OMC_PLUGIN_KEY = 'oh-my-claudecode@omc'

/** The slash-command namespace OMC's skills run under. */
export const OMC_NAMESPACE = 'oh-my-claudecode'

/** The main workflows, listed first in this order; every other skill follows by name. */
export const MAIN_WORKFLOWS = [
  'autopilot',
  'ralph',
  'team',
  'ralplan',
  'ultragoal',
  'deep-interview',
  'autoresearch',
] as const

// Frontmatter.

/** Reads one scalar after `key:`: quoted (double or single) or plain with a trailing `# comment` dropped. */
function scalar(raw: string): string {
  const text = raw.trim()
  if (text.startsWith('"')) {
    let out = ''
    for (let i = 1; i < text.length; i++) {
      const ch = text[i]
      if (ch === '\\' && i + 1 < text.length) {
        const nextCh = text[i + 1]
        out += nextCh === 'n' ? '\n' : nextCh === 't' ? '\t' : nextCh
        i++
        continue
      }
      if (ch === '"') {
        return out
      }
      out += ch
    }

    return out
  }
  if (text.startsWith("'")) {
    let out = ''
    for (let i = 1; i < text.length; i++) {
      if (text[i] === "'") {
        if (text[i + 1] === "'") {
          out += "'"
          i++
          continue
        }

        return out
      }
      out += text[i]
    }

    return out
  }
  const comment = text.search(/\s#/)

  return (comment === -1 ? text : text.slice(0, comment)).trim()
}

/**
 * The top-level scalar keys of a SKILL.md's YAML frontmatter. Folded and
 * literal block scalars (`>`, `|`) are joined; nested maps and lists are skipped.
 * Returns null when the text has no frontmatter.
 */
export function frontmatter(text: string): Record<string, string> | null {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/)
  if (lines[0]?.trim() !== '---') {
    return null
  }
  const out: Record<string, string> = {}
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i] ?? ''
    if (line.trim() === '---') {
      return out
    }
    const match = /^([A-Za-z_][\w-]*):(.*)$/.exec(line)
    if (match === null) {
      continue
    }
    const key = match[1] ?? ''
    const value = (match[2] ?? '').trim()
    if (/^[>|][+-]?$/.test(value)) {
      const block: string[] = []
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1] ?? '')) {
        block.push((lines[++i] ?? '').trim())
      }
      out[key] = block.join(value.startsWith('>') ? ' ' : '\n')
      continue
    }
    out[key] = scalar(value)
  }

  return null
}

/** A skill as the picker lists it, from its directory name and SKILL.md text; null without frontmatter. */
export function skillFrom(dir: string, text: string): Skill | null {
  const meta = frontmatter(text)
  if (meta === null) {
    return null
  }
  const hint = (meta['argument-hint'] ?? '').trim()

  return {
    name: dir,
    description: (meta.description ?? '').trim(),
    hint: hint === '' ? null : hint,
  }
}

/** Main workflows first in MAIN_WORKFLOWS order, then the rest by name. */
export function orderSkills(skills: readonly Skill[]): Skill[] {
  const rank = (name: string) => {
    const at = (MAIN_WORKFLOWS as readonly string[]).indexOf(name)

    return at === -1 ? MAIN_WORKFLOWS.length : at
  }

  return [...skills].sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name))
}

// argument-hint.

const FLAG = String.raw`--[A-Za-z0-9][\w-]*`
const WORD = String.raw`[A-Za-z0-9][\w.-]*`
const IDENT = String.raw`[A-Za-z][\w-]*`

/** Splits a hint into top-level `[...]`, `<...>` and bare tokens; null when brackets do not balance. */
export function tokenize(hint: string): { kind: 'optional' | 'required' | 'bare'; text: string }[] | null {
  const tokens: { kind: 'optional' | 'required' | 'bare'; text: string }[] = []
  let i = 0
  while (i < hint.length) {
    const ch = hint[i] ?? ''
    if (/\s/.test(ch)) {
      i++
      continue
    }
    if (ch === '[' || ch === '<') {
      const close = ch === '[' ? ']' : '>'
      const end = hint.indexOf(close, i + 1)
      if (end === -1) {
        return null
      }
      tokens.push({ kind: ch === '[' ? 'optional' : 'required', text: hint.slice(i + 1, end).trim() })
      i = end + 1
      continue
    }
    if (ch === ']' || ch === '>') {
      return null
    }
    let end = i
    while (end < hint.length && !/\s/.test(hint[end] ?? '')) {
      end++
    }
    let text = hint.slice(i, end)
    // A bare valued flag takes its `<value>` with it: `--x <v>`.
    const rest = hint.slice(end)
    const value = /^\s+<([^<>]*)>/.exec(rest)
    if (new RegExp(`^${FLAG}$`).test(text) && value !== null) {
      text = `${text} <${value[1]}>`
      end += value[0].length
    }
    tokens.push({ kind: 'bare', text })
    i = end
  }

  return tokens
}

/** One flag-shaped token (inside `[...]`, or bare) as a field; null when it is no flag shape this reads. */
function flagField(text: string, id: string, required: boolean): Field | null {
  let m = new RegExp(`^(${FLAG})=(${WORD}(?:\\|${WORD})+)$`).exec(text)
  if (m !== null) {
    const flag = m[1] ?? ''

    return {
      kind: 'choice',
      id,
      label: flag,
      options: (m[2] ?? '').split('|').map(v => ({ label: v, emit: `${flag}=${v}` })),
      required,
    }
  }
  m = new RegExp(`^(${FLAG})(?:\\|(${FLAG}))+$`).exec(text)
  if (m !== null) {
    return {
      kind: 'choice',
      id,
      label: text,
      options: text.split('|').map(v => ({ label: v, emit: v })),
      required,
    }
  }
  m = new RegExp(`^(${FLAG})(=| )<([^<>]+)>$`).exec(text)
  if (m !== null) {
    return {
      kind: 'value',
      id,
      flag: m[1] ?? '',
      joiner: m[2] === '=' ? '=' : ' ',
      placeholder: (m[3] ?? '').trim(),
      required,
    }
  }
  m = new RegExp(`^(${FLAG}) (${WORD}(?:\\|${WORD})+)$`).exec(text)
  if (m !== null) {
    const flag = m[1] ?? ''

    return {
      kind: 'choice',
      id,
      label: flag,
      options: (m[2] ?? '').split('|').map(v => ({ label: v, emit: `${flag} ${v}` })),
      required,
    }
  }
  if (required) {
    // A bare flag that is always present, or a fixed `--x word`, is no choice for a form.
    return null
  }
  if (new RegExp(`^${FLAG}(?:[= ]${WORD})?$`).test(text)) {
    return { kind: 'toggle', id, label: text, emit: text }
  }

  return null
}

/**
 * The form an argument-hint describes, one field per flag or positional, in
 * hint order; null when any part is a shape this does not read, so the caller
 * falls back to one free-text field.
 *
 * - `[--x=a|b|c]` a Select of `--x=a`...; `[--a|--b]` a Select of the flags;
 *   `[--x a|b]` a Select of `--x a`...
 * - `[--flag]` and `[--x word]` a toggle emitting that text.
 * - `[--x <v>]` and `[--x=<v>]` an Input.
 * - `[A:B]` a pair of Inputs emitting `a:b`.
 * - `[a|b|c]` of single words, a positional Select.
 * - `[word]` before any positional, a toggle emitting the word (a keyword such as
 *   `ralph`); after one, an optional positional text (more arguments, such as `args`).
 *   The risk: hint syntax cannot tell a keyword from a one-word placeholder, so
 *   a future `[path] <task>` would draw `path` as a toggle emitting the literal
 *   word. Placement is the only signal; a misread shows on the review step.
 * - `<anything>` a required positional text; `[several words]` an optional one.
 */
export function parseHint(hint: string): Field[] | null {
  const tokens = tokenize(hint)
  if (tokens === null || tokens.length === 0) {
    return null
  }
  const fields: Field[] = []
  let seenPositional = false
  for (const [index, token] of tokens.entries()) {
    const id = `f${index}`
    const { text } = token
    if (text === '') {
      return null
    }
    if (text.startsWith('-')) {
      const field = flagField(text, id, token.kind !== 'optional')
      if (field === null) {
        return null
      }
      fields.push(field)
      continue
    }
    if (token.kind === 'bare') {
      // A bare word outside brackets is a literal this form cannot offer.
      return null
    }
    if (token.kind === 'required') {
      fields.push({ kind: 'text', id, label: text, required: true, verbatim: false })
      seenPositional = true
      continue
    }
    const pair = new RegExp(`^(${IDENT}):(${IDENT})$`).exec(text)
    if (pair !== null) {
      fields.push({ kind: 'pair', id, left: pair[1] ?? '', right: pair[2] ?? '' })
      continue
    }
    if (new RegExp(`^${WORD}(?:\\|${WORD})+$`).test(text)) {
      fields.push({
        kind: 'choice',
        id,
        label: text,
        options: text.split('|').map(v => ({ label: v, emit: v })),
        required: false,
      })
      seenPositional = true
      continue
    }
    // A lone word before any positional is a keyword: see the risk noted above.
    if (new RegExp(`^${IDENT}$`).test(text) && !seenPositional) {
      fields.push({ kind: 'toggle', id, label: text, emit: text })
      continue
    }
    fields.push({ kind: 'text', id, label: text, required: false, verbatim: false })
    seenPositional = true
  }

  return fields
}

/** The form for a skill: its parsed hint, or one free-text arguments field. */
export function formFor(skill: Skill): { fields: Field[]; isFallback: boolean } {
  const parsed = skill.hint === null ? null : parseHint(skill.hint)
  if (parsed !== null) {
    return { fields: parsed, isFallback: false }
  }

  return {
    fields: [{ kind: 'text', id: 'args', label: skill.hint ?? 'arguments', required: false, verbatim: true }],
    isFallback: skill.hint !== null,
  }
}

/** The words the form's toggles emit, which a bare task word could be mistaken for. */
function keywords(fields: readonly Field[]): string[] {
  return fields.flatMap(field => (field.kind === 'toggle' ? [field.emit] : []))
}

/**
 * Task text as the skill should read it: one plain word that is no keyword
 * stays bare (a subcommand such as `list`); anything else goes in double
 * quotes, as the skills' own usage examples write a task, with backslashes and
 * double quotes escaped, so it cannot be read as a flag, a keyword or several
 * arguments.
 */
export function quoteText(text: string, words: readonly string[]): string {
  // No `:` in a bare word: `2:codex` would read as team's N:agent-type.
  if (/^[A-Za-z0-9][\w./#@-]*$/.test(text) && !words.includes(text)) {
    return text
  }

  return `"${text.replace(/["\\]/g, ch => `\\${ch}`)}"`
}

/** What one field contributes to the command line, or null when it is left empty. */
export function emitField(field: Field, values: Readonly<Record<string, string>>, words: readonly string[] = []): string | null {
  const value = values[field.id] ?? ''
  switch (field.kind) {
    case 'toggle':
      return value === 'on' ? field.emit : null
    case 'choice':
      return field.options.find(option => option.emit === value)?.emit ?? null
    case 'value': {
      const v = value.trim()

      // A value holding whitespace would split into several arguments: it is
      // left out and named on the review step.
      return v === '' || /\s/.test(v) ? null : `${field.flag}${field.joiner}${v}`
    }
    case 'pair': {
      const left = (values[`${field.id}-left`] ?? '').trim()
      const right = (values[`${field.id}-right`] ?? '').trim()

      return left !== '' && right !== '' ? `${left}:${right}` : null
    }
    case 'text': {
      const v = value.trim()
      if (v === '') {
        return null
      }

      return field.verbatim ? v : quoteText(v, words)
    }
  }
}

/**
 * The exact command line: `/oh-my-claudecode:<skill>` and its arguments in
 * hint order. Task text is quoted when it could be misread (quoteText); the
 * fallback free-text field goes in as typed.
 */
export function buildCommand(skill: string, fields: readonly Field[], values: Readonly<Record<string, string>>): string {
  const args = buildArgs(fields, values)

  return `/${commandName(skill)}${args === '' ? '' : ` ${args}`}`
}

/** The slash command's name without its slash: `oh-my-claudecode:<skill>`. */
export function commandName(skill: string): string {
  return `${OMC_NAMESPACE}:${skill}`
}

/** Everything after the command name, each field's part in hint order. */
export function buildArgs(fields: readonly Field[], values: Readonly<Record<string, string>>): string {
  const words = keywords(fields)
  const parts: string[] = []
  for (const field of fields) {
    const part = emitField(field, values, words)
    if (part !== null) {
      parts.push(part)
    }
  }

  return parts.join(' ')
}

/** The values a form opens with: a required choice starts on its first option, as it is drawn. */
export function seedValues(fields: readonly Field[]): Record<string, string> {
  const values: Record<string, string> = {}
  for (const field of fields) {
    const first = field.kind === 'choice' && field.required ? field.options[0] : undefined
    if (first !== undefined) {
      values[field.id] = first.emit
    }
  }

  return values
}

/**
 * What the review step warns about, any of which makes Run a two-press action:
 * required fields left empty, half-filled pairs, values holding whitespace, and
 * task text starting with `-`.
 */
export function warnings(fields: readonly Field[], values: Readonly<Record<string, string>>): string[] {
  const out: string[] = []
  for (const field of fields) {
    if (field.kind === 'pair') {
      const left = (values[`${field.id}-left`] ?? '').trim()
      const right = (values[`${field.id}-right`] ?? '').trim()
      if ((left === '') !== (right === '')) {
        out.push(`${field.left}:${field.right} needs both parts`)
      }
      continue
    }
    const value = (values[field.id] ?? '').trim()
    if (field.kind === 'value' && /\s/.test(value)) {
      out.push(`${field.flag} cannot hold spaces, so it is left out`)
      continue
    }
    if (field.kind === 'text' && value.startsWith('-')) {
      out.push(`${field.label} starts with "-"`)
    }
    if ((field.kind === 'text' || field.kind === 'value' || field.kind === 'choice') && field.required && emitField(field, values) === null) {
      out.push(`${field.kind === 'value' ? field.flag : field.label} is required`)
    }
  }

  return out
}

// JSONC config.

/**
 * JSONC to JSON in OMC's own order (`dist/utils/jsonc.js`): drop a leading BOM,
 * then comments (a block comment becomes a space), then trailing commas, each
 * pass leaving string contents untouched. Throws on an unterminated block comment.
 */
export function stripJsonc(text: string): string {
  return stripTrailingCommas(stripComments(text.replace(/^\uFEFF/, '')))
}

/** The index just past the string literal that opens at `start`. */
function stringEnd(text: string, start: number): number {
  let end = start + 1
  while (end < text.length && text[end] !== '"') {
    end += text[end] === '\\' ? 2 : 1
  }

  return end + 1
}

function stripComments(text: string): string {
  let out = ''
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    if (ch === '"') {
      const end = stringEnd(text, i)
      out += text.slice(i, end)
      i = end
      continue
    }
    if (ch === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') {
        i++
      }
      continue
    }
    if (ch === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2)
      if (end === -1) {
        throw new SyntaxError('Unterminated JSONC block comment')
      }
      out += ' '
      i = end + 2
      continue
    }
    out += ch
    i++
  }

  return out
}

function stripTrailingCommas(text: string): string {
  let out = ''
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    if (ch === '"') {
      const end = stringEnd(text, i)
      out += text.slice(i, end)
      i = end
      continue
    }
    if (ch === ',') {
      let j = i + 1
      while (j < text.length && /\s/.test(text[j] ?? '')) {
        j++
      }
      if (text[j] === '}' || text[j] === ']') {
        i++
        continue
      }
    }
    out += ch
    i++
  }

  return out
}

/** Parses a JSONC text; null when it does not parse to an object. */
export function parseJsonc(text: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(stripJsonc(text))

    return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/** The profile names OMC admits (`^[a-z][a-z0-9-]{0,62}$`); other keys are not offered. */
export const CONFIG_NAME = /^[a-z][a-z0-9-]{0,62}$/

/**
 * The names a valued flag can take from OMC config: the keys of the object at
 * `<skill>.<flag name>s` (autopilot's `--workflow` reads `autopilot.workflows`)
 * that match CONFIG_NAME, the project's first, then the user's, without repeats.
 */
export function configChoices(skill: string, flag: string, configs: readonly (Record<string, unknown> | null)[]): string[] {
  const key = `${flag.replace(/^--/, '')}s`
  const names: string[] = []
  for (const config of configs) {
    const section = config?.[skill]
    const table = typeof section === 'object' && section !== null ? (section as Record<string, unknown>)[key] : undefined
    if (typeof table !== 'object' || table === null || Array.isArray(table)) {
      continue
    }
    for (const name of Object.keys(table)) {
      if (CONFIG_NAME.test(name) && !names.includes(name)) {
        names.push(name)
      }
    }
  }

  return names
}

// Finding OMC.

/** Compares dot-separated parts, numbers numerically and anything else as text; a missing part reads as `missing`. */
function compareParts(x: readonly string[], y: readonly string[], missing: string): number {
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const p = x[i] ?? missing
    const q = y[i] ?? missing
    const np = Number(p)
    const nq = Number(q)
    const diff = p !== '' && q !== '' && Number.isFinite(np) && Number.isFinite(nq) ? np - nq : p.localeCompare(q)
    if (diff !== 0) {
      return diff
    }
  }

  return 0
}

/**
 * Compares versions as semver orders them: the dotted core numerically
 * (`5.10.0` > `5.8.6`), then a release above its prereleases
 * (`5.9.0` > `5.9.0-beta.1`), prereleases part by part. Build metadata is ignored.
 */
export function compareVersions(a: string, b: string): number {
  const split = (v: string) => {
    const bare = v.split('+')[0] ?? ''
    const dash = bare.indexOf('-')

    return dash === -1 ? { core: bare, pre: null } : { core: bare.slice(0, dash), pre: bare.slice(dash + 1) }
  }
  const va = split(a)
  const vb = split(b)
  const core = compareParts(va.core.split('.'), vb.core.split('.'), '0')
  if (core !== 0 || va.pre === vb.pre) {
    return core
  }
  if (va.pre === null || vb.pre === null) {
    return va.pre === null ? 1 : -1
  }

  return compareParts(va.pre.split('.'), vb.pre.split('.'), '')
}

/** True when `path` is `root` or inside it. */
function isWithin(path: string, root: unknown): boolean {
  return typeof root === 'string' && root !== '' && (path === root || path.startsWith(`${root.replace(/\/+$/, '')}/`))
}

type InstallEntry = { installPath?: unknown; version?: unknown; scope?: unknown; projectPath?: unknown }

/**
 * OMC's install path from installed_plugins.json: of the entries for this
 * session (user scope, or a project or local scope whose projectPath holds
 * the cwd), the highest version. Null when none. It only says where the
 * SKILL.md files are: which skills can run is the session's command list.
 */
export function installPathFrom(installedJson: string, cwd: string): string | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(installedJson)
  } catch {
    return null
  }
  const root = typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {}
  const table = typeof root.plugins === 'object' && root.plugins !== null ? (root.plugins as Record<string, unknown>) : root
  const raw = table[OMC_PLUGIN_KEY]
  const entries: InstallEntry[] = Array.isArray(raw) ? raw : typeof raw === 'object' && raw !== null ? [raw as InstallEntry] : []
  const usable = entries.filter(
    entry =>
      typeof entry.installPath === 'string' &&
      entry.installPath !== '' &&
      (entry.scope === undefined || entry.scope === 'user' || isWithin(cwd, entry.projectPath)),
  )
  usable.sort((a, b) => compareVersions(String(b.version ?? '0'), String(a.version ?? '0')))

  const best = usable[0]

  return best === undefined ? null : (best.installPath as string)
}

/** The highest version directory name in OMC's plugin cache, or null. */
export function highestVersion(names: readonly string[]): string | null {
  const versions = names.filter(name => /^\d+(\.\d+)*([.+-][\w.]+)?$/.test(name))
  versions.sort((a, b) => compareVersions(b, a))

  return versions[0] ?? null
}

/** Joins path parts with single slashes. */
export function join(...parts: string[]): string {
  return parts
    .filter(part => part !== '')
    .map((part, i) => (i === 0 ? part.replace(/\/+$/, '') : part.replace(/^\/+|\/+$/g, '')))
    .join('/')
}
