// Pure logic for guardrail-notice: naming a refusal's source, working out what
// kind of call was refused, finding the safe form a refusal names, and keeping
// the list of refusals that still wait on the person. No engine calls here.

import type { Refusal } from '../types'

/** A pattern that names the hook behind a refusal's text. */
export type Source = { label: string; pattern: RegExp }

/** The label for a hook refusal that no pattern names. */
export const GENERIC = 'hook'

/**
 * The built-in patterns, checked after the person's own.
 *
 * - OMC's git guardrail (scripts/git-guardrails.mjs) starts its message with
 *   `Git guardrail: blocked "<label>".`
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

// A pattern from settings is the person's own; these keep a typo from
// costing much. Longer entries are skipped.
const MAX_PATTERN = 500
const MAX_MESSAGE = 400
const MAX_SAFE_FORM = 200

/** Keeps at most this many refusals for the chat cards. */
export const MAX_CALLS = 50
/** Keeps at most this many refusals waiting in the band. */
export const MAX_ACTIVE = 5

/**
 * Reads the `patterns` setting: `Label=expression`, or a bare expression named
 * `hook`. An entry that is empty, too long or not a valid expression is
 * skipped and returned in `skipped`, so the caller can log it.
 */
export function parsePatterns(value: unknown): { sources: Source[]; skipped: string[] } {
  const sources: Source[] = []
  const skipped: string[] = []
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
    if (body.length > MAX_PATTERN || label === '') {
      skipped.push(entry)
      continue
    }
    try {
      sources.push({ label, pattern: new RegExp(body) })
    } catch {
      skipped.push(entry)
    }
  }

  return { sources, skipped }
}

/** Names the hook behind a refusal: the first matching pattern's label, else `hook`. */
export function classify(reason: string, sources: readonly Source[]): string {
  for (const { label, pattern } of sources) {
    if (pattern.test(reason)) {
      return label
    }
  }

  return GENERIC
}

// Tools whose second word is the operation (`git push`, `gh pr`).
const SUBCOMMANDS = new Set([
  'git', 'gh', 'npm', 'pnpm', 'yarn', 'bun', 'uv', 'pip', 'cargo', 'go', 'docker',
  'kubectl', 'helm', 'terraform', 'tofu', 'bao', 'vault', 'brew', 'claude', 'coder',
])
// Leading words that say nothing about what the command does.
const PREFIXES = new Set(['sudo', 'env', 'command', 'exec', 'time', 'nice', 'nohup'])
// Segments of a compound command that only set up the one that matters.
const SETUP = new Set(['cd', 'pushd', 'export', 'set', 'source', '.', 'true', ':'])

/** The kind of a Bash command, such as `git push` or `rm`: its first real program and operation. */
export function commandKind(command: string): string {
  for (const segment of command.split(/&&|\|\||[;|\n]/)) {
    const words = segment.trim().split(/\s+/).filter(word => word !== '')
    let first = words[0]
    while (first !== undefined && (PREFIXES.has(first) || /^[A-Za-z_][A-Za-z0-9_]*=/.test(first))) {
      words.shift()
      first = words[0]
    }
    if (first === undefined || SETUP.has(first)) {
      continue
    }
    const program = first.replace(/^.*\//, '')
    // The operation is the first word after the program that is not an option
    // (`git -C dir push` is `git push`); an option's value is skipped too.
    if (SUBCOMMANDS.has(program)) {
      for (let i = 1; i < words.length; i += 1) {
        const word = words[i] ?? ''
        if (word.startsWith('-')) {
          if (/^-[Cc]$/.test(word)) {
            i += 1
          }
          continue
        }
        if (/^[a-z][a-z0-9-]*$/.test(word)) {
          return `${program} ${word}`
        }
        break
      }
    }

    return program
  }

  return 'Bash'
}

/** The kind of a tool call: a Bash command's kind, otherwise the tool's name. */
export function kindOf(tool: string, input: { readonly [key: string]: unknown }): string {
  if (tool === 'Bash' && typeof input.command === 'string') {
    return commandKind(input.command)
  }

  return tool
}

/** Shortens text to `max` characters, ending in an ellipsis when cut. */
export function truncate(text: string, max: number): string {
  const flat = text.trim()

  return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`
}

/**
 * The safe form a refusal names after "Safe form:", up to the end of that
 * sentence (a period outside backticks followed by a space or the end), or
 * null when it names none.
 */
export function safeFormOf(reason: string): string | null {
  const at = /Safe form:\s*/i.exec(reason)
  if (at === null) {
    return null
  }
  const rest = reason.slice(at.index + at[0].length)
  let inCode = false
  let end = rest.length
  for (let i = 0; i < rest.length; i += 1) {
    const c = rest[i]
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
    kind: kindOf(call.tool, call.input),
    source: classify(reason, sources),
    message: truncate(reason, MAX_MESSAGE),
    safeForm: safeFormOf(reason),
  }
}

/** The band's line for a refusal. */
export function summary(refusal: Refusal): string {
  return `Blocked: ${refusal.kind} (${refusal.source}). Needs you.`
}

/** Adds a refusal to the waiting list: newest first, one per kind, at most MAX_ACTIVE. */
export function addActive(list: readonly Refusal[], refusal: Refusal): Refusal[] {
  return [refusal, ...list.filter(item => item.kind !== refusal.kind)].slice(0, MAX_ACTIVE)
}

/** Records a refusal for its chat card, dropping the oldest past MAX_CALLS. */
export function addCall(calls: Readonly<Record<string, Refusal>>, refusal: Refusal): Record<string, Refusal> {
  const kept = Object.entries(calls).filter(([id]) => id !== refusal.toolUseId)

  return Object.fromEntries([...kept, [refusal.toolUseId, refusal]].slice(-MAX_CALLS))
}

/** Removes every waiting refusal of one kind (a later success of that kind clears it). */
export function clearKind(list: readonly Refusal[], kind: string): Refusal[] {
  return list.filter(item => item.kind !== kind)
}

/** Removes one waiting refusal (the person dismissed it). */
export function dismiss(list: readonly Refusal[], toolUseId: string): Refusal[] {
  return list.filter(item => item.toolUseId !== toolUseId)
}
