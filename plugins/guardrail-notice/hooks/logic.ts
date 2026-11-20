// Pure logic for guardrail-notice: naming a refusal's source and operation,
// reading a Bash command's kinds, the key a later success must match to clear
// a refusal, the safe form a refusal names, and the list of refusals that
// still wait on the person. No engine calls here.

import type { Refusal } from '../types'

/** A pattern that names the hook behind a refusal's text. */
export type Source = { label: string; pattern: RegExp }

/** The label for a hook refusal that no pattern names. */
export const GENERIC = 'hook'

/**
 * The built-in patterns, checked after the person's own.
 *
 * - OMC's git guardrail (scripts/git-guardrails.mjs) starts its message with
 *   `Git guardrail: blocked "<operation>".`
 * - The operating-model command guard (hooks/guard-bash-command.py) has no
 *   fixed prefix: each rule's message is followed by "Do not retry through
 *   another tool or wrap the command in a script", and its size and time
 *   refusals say "refused because ... the command guard".
 */
export const BUILT_IN: readonly Source[] = [
  { label: 'OMC guardrail', pattern: /Git guardrail: blocked/ },
  {
    label: 'command guard',
    pattern:
      /Do not retry through another tool or wrap the command in a script|refused because (?:the command guard|it is too long for the command guard)/,
  },
]

// Where a refusal names the operation it refused: OMC's quoted label, and the
// command guard's rules that open with the command in backticks
// ("`gh pr merge --auto` is refused: ...").
const NAMED = [/Git guardrail: blocked "([^"\n]{1,80})"/, /^`([^`\n]{1,80})` is refused/m]

// A user pattern with a quantified group that is itself quantified, such as
// (a+)+ or (x*){2,}, can take exponential time; it is refused at parse time.
const NESTED = /\([^)]*[+*]\)[+*{]/
const MAX_PATTERN = 500
// Patterns are matched against at most this much of a refusal's text.
export const MAX_CLASSIFIED = 2000
const MAX_MESSAGE = 400
const MAX_SAFE_FORM = 200
const MAX_LABEL = 60

/** Keeps at most this many refusals waiting in the band. */
export const MAX_ACTIVE = 5

/** A settings entry that was not used, and why. */
export type Skipped = { entry: string; why: string }

/**
 * Reads the `patterns` setting: `Label=expression`, or a bare expression named
 * `hook`. Everything before the first `=` is the label, so an expression that
 * contains `=` must be written with a label. An entry that is too long, not a
 * valid expression, or has a nested quantifier is skipped and returned with
 * the reason.
 */
export function parsePatterns(value: unknown): { sources: Source[]; skipped: Skipped[] } {
  const sources: Source[] = []
  const skipped: Skipped[] = []
  if (!Array.isArray(value)) {
    return { sources, skipped }
  }
  for (const raw of value) {
    if (typeof raw !== 'string') {
      continue
    }
    const entry = raw.trim()
    if (entry === '') {
      continue
    }
    const split = /^([^=]{1,40})=(.+)$/.exec(entry)
    const label = split?.[1]?.trim() ?? GENERIC
    const body = split?.[2] ?? entry
    if (label === '') {
      skipped.push({ entry, why: 'empty label' })
    } else if (body.length > MAX_PATTERN) {
      skipped.push({ entry, why: `longer than ${MAX_PATTERN} characters` })
    } else if (NESTED.test(body)) {
      skipped.push({ entry, why: 'nested quantifier (can take exponential time)' })
    } else {
      try {
        sources.push({ label, pattern: new RegExp(body) })
      } catch {
        skipped.push({ entry, why: 'not a valid regular expression' })
      }
    }
  }

  return { sources, skipped }
}

/** Names the hook behind a refusal: the first matching pattern's label, else `hook`. */
export function classify(reason: string, sources: readonly Source[]): string {
  const text = reason.slice(0, MAX_CLASSIFIED)
  for (const { label, pattern } of sources) {
    if (pattern.test(text)) {
      return label
    }
  }

  return GENERIC
}

/** The operation a refusal names itself (OMC's quoted label, the guard's backticked command), or null. */
export function namedOperation(reason: string): string | null {
  const text = reason.slice(0, MAX_CLASSIFIED)
  for (const pattern of NAMED) {
    const found = pattern.exec(text)?.[1]?.trim()
    if (found) {
      return found
    }
  }

  return null
}

/** One token of a command line: a word (unquoted) or a control operator. */
type Token = { word: string } | { op: string }

/**
 * Splits a command line into words and control operators the way a shell
 * would for this purpose: quotes and backslashes protect what they enclose,
 * and `&&`, `||`, `;`, `|`, `&` and newlines outside quotes separate commands.
 */
export function tokenize(command: string): Token[] {
  const tokens: Token[] = []
  let word = ''
  let hasWord = false
  let quote: '"' | "'" | null = null
  const flush = () => {
    if (hasWord) {
      tokens.push({ word })
    }
    word = ''
    hasWord = false
  }
  for (let i = 0; i < command.length; i += 1) {
    const c = command.charAt(i)
    if (quote !== null) {
      if (c === quote) {
        quote = null
      } else if (c === '\\' && quote === '"' && i + 1 < command.length) {
        i += 1
        word += command.charAt(i)
      } else {
        word += c
      }
    } else if (c === "'" || c === '"') {
      quote = c
      hasWord = true
    } else if (c === '\\' && i + 1 < command.length) {
      i += 1
      word += command.charAt(i)
      hasWord = true
    } else if (c === ' ' || c === '\t') {
      flush()
    } else if (c === '&' && (command.charAt(i - 1) === '>' || command.charAt(i - 1) === '<' || command.charAt(i + 1) === '>')) {
      // A redirection (`2>&1`, `&>file`), not a separator.
      word += c
      hasWord = true
    } else if (c === '\n' || c === ';' || c === '&' || c === '|') {
      flush()
      const pair = command.slice(i, i + 2)
      const op = pair === '&&' || pair === '||' ? pair : c
      i += op.length - 1
      tokens.push({ op })
    } else {
      word += c
      hasWord = true
    }
  }
  flush()

  return tokens
}

/** The commands of a command line, each as its words. */
function segments(command: string): string[][] {
  const out: string[][] = [[]]
  for (const token of tokenize(command)) {
    if ('op' in token) {
      out.push([])
    } else {
      out[out.length - 1]?.push(token.word)
    }
  }

  return out.filter(words => words.length > 0)
}

// Tools whose second word is the operation (`git push`, `gh pr`).
const SUBCOMMANDS = new Set([
  'git', 'gh', 'npm', 'pnpm', 'yarn', 'bun', 'uv', 'pip', 'cargo', 'go', 'docker',
  'kubectl', 'helm', 'terraform', 'tofu', 'bao', 'vault', 'brew', 'claude', 'coder',
])
// Options of those tools that take a separate value (`git -C dir`, `gh -R o/r`).
const VALUE_OPTIONS = new Set(['-C', '-c', '-R', '--repo'])
const SHELLS = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh'])
// Leading words that say nothing about what the command does.
const PREFIXES = new Set(['sudo', 'env', 'command', 'exec', 'time', 'nice', 'nohup'])
// Commands that only set up the one that matters.
const SETUP = new Set(['cd', 'pushd', 'export', 'set', 'source', '.', 'true', ':'])
const MAX_DEPTH = 3

/**
 * The kinds of the commands in a Bash command line, such as
 * `['git add', 'git commit', 'git push']`: each command's program, plus the
 * operation for tools that have one. Setup steps and prefixes are skipped,
 * and the command string of `bash -c` / `sh -c` is read the same way.
 */
export function commandKinds(command: string, depth = 0): string[] {
  const kinds: string[] = []
  for (const words of segments(command)) {
    while (words.length > 0 && (PREFIXES.has(words[0] ?? '') || /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[0] ?? ''))) {
      words.shift()
    }
    const first = words[0]
    if (first === undefined || SETUP.has(first)) {
      continue
    }
    const program = first.replace(/^.*\//, '')
    if (SHELLS.has(program)) {
      const flag = words.findIndex((word, i) => i > 0 && /^-[a-z]*c[a-z]*$/.test(word))
      const inner = flag > 0 ? words[flag + 1] : undefined
      if (inner !== undefined && depth < MAX_DEPTH) {
        kinds.push(...commandKinds(inner, depth + 1))
        continue
      }
    }
    kinds.push(SUBCOMMANDS.has(program) ? operationKind(program, words) : program)
  }

  return kinds
}

function operationKind(program: string, words: readonly string[]): string {
  for (let i = 1; i < words.length; i += 1) {
    const word = words[i] ?? ''
    if (word.startsWith('-')) {
      if (VALUE_OPTIONS.has(word)) {
        i += 1
      }
      continue
    }

    return /^[a-z][a-z0-9-]*$/.test(word) ? `${program} ${word}` : program
  }

  return program
}

/** A command line with its spacing made regular and its words re-quoted where needed. */
export function normalizeCommand(command: string): string {
  return tokenize(command)
    .map(token => ('op' in token ? token.op : /^[\w@%+=:,./-]+$/.test(token.word) ? token.word : JSON.stringify(token.word)))
    .join(' ')
}

// Keys of a tool call's input that are not the tool's own arguments.
const RESERVED = new Set(['tool', 'tool_use_id', 'agentId', 'requestMeta', 'consent'])

function stable(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stable)
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))

    return Object.fromEntries(entries.map(([k, v]) => [k, stable(v)]))
  }

  return value
}

/**
 * What a later successful call must equal to clear a refusal: for Bash, the
 * normalized command; for any other tool, the tool and its whole input.
 */
export function callKey(tool: string, input: { readonly [key: string]: unknown }): string {
  if (tool === 'Bash' && typeof input.command === 'string') {
    return `Bash\n${normalizeCommand(input.command)}`
  }
  const args = Object.fromEntries(Object.entries(input).filter(([key]) => !RESERVED.has(key)))

  return `${tool}\n${JSON.stringify(stable(args))}`
}

/** Shortens text to `max` characters, ending in an ellipsis when cut. */
export function truncate(text: string, max: number): string {
  const flat = text.trim()

  return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`
}

/**
 * What the band calls a refused call: the operation the refusal names; for a
 * Bash command with one kind, that kind; with several, the command itself
 * (shortened); for any other tool, its name.
 */
export function labelOf(tool: string, input: { readonly [key: string]: unknown }, reason: string): string {
  const named = namedOperation(reason)
  if (named !== null) {
    return named
  }
  if (tool !== 'Bash' || typeof input.command !== 'string') {
    return tool
  }
  const kinds = commandKinds(input.command)
  if (kinds.length === 1 && kinds[0] !== undefined) {
    return kinds[0]
  }

  return kinds.length === 0 ? 'Bash' : truncate(normalizeCommand(input.command), MAX_LABEL)
}

/**
 * The safe form a refusal names after "Safe form:", up to the end of that
 * sentence (a period outside backticks followed by a space or the end), or
 * null when it names none.
 */
export function safeFormOf(reason: string): string | null {
  const text = reason.slice(0, MAX_CLASSIFIED)
  const at = /Safe form:\s*/i.exec(text)
  if (at === null) {
    return null
  }
  const rest = text.slice(at.index + at[0].length)
  let inCode = false
  let end = rest.length
  for (let i = 0; i < rest.length; i += 1) {
    const c = rest.charAt(i)
    if (c === '`') {
      inCode = !inCode
    } else if (!inCode && (c === '\n' || (c === '.' && /^(\s|$)/.test(rest.slice(i + 1, i + 2))))) {
      end = c === '.' ? i + 1 : i
      break
    }
  }
  const found = rest.slice(0, end).trim()

  return found === '' ? null : truncate(found, MAX_SAFE_FORM)
}

/** Builds the refusal record for one refused call. */
export function describe(
  call: { tool: string; toolUseId: string; input: { readonly [key: string]: unknown } },
  reason: string,
  sources: readonly Source[],
): Refusal {
  return {
    toolUseId: call.toolUseId,
    tool: call.tool,
    kind: labelOf(call.tool, call.input, reason),
    key: callKey(call.tool, call.input),
    source: classify(reason, sources),
    message: truncate(reason, MAX_MESSAGE),
    safeForm: safeFormOf(reason),
  }
}

/** The band's line for a refusal. */
export function summary(refusal: Refusal): string {
  return `Blocked: ${refusal.kind} (${refusal.source}). Needs you.`
}

/** Adds a refusal to the waiting list: newest first, one per call key, at most MAX_ACTIVE. */
export function addActive(list: readonly Refusal[], refusal: Refusal): Refusal[] {
  return [refusal, ...list.filter(item => item.key !== refusal.key)].slice(0, MAX_ACTIVE)
}

/** Whether the waiting list already shows a refusal of this kind (no second toast). */
export function isShown(list: readonly Refusal[], refusal: Refusal): boolean {
  return list.some(item => item.kind === refusal.kind)
}

/** Removes every waiting refusal whose call key is exactly this one. */
export function clearKey(list: readonly Refusal[], key: string): Refusal[] {
  return list.filter(item => item.key !== key)
}

/** Removes one waiting refusal (the person dismissed it). */
export function dismiss(list: readonly Refusal[], toolUseId: string): Refusal[] {
  return list.filter(item => item.toolUseId !== toolUseId)
}
