import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import {
  addActive,
  addCall,
  BUILT_IN,
  classify,
  clearKind,
  commandKind,
  describe,
  dismiss,
  GENERIC,
  MAX_ACTIVE,
  MAX_CALLS,
  parsePatterns,
  safeFormOf,
  summary,
  truncate,
} from '../hooks/logic'
import type { Refusal } from '../types'

// Refusal texts as the real hooks write them to stderr (exit 2).
// OMC 5.8.6 scripts/git-guardrails.mjs, guardMessage('git push', 'ralph').
const OMC = [
  'Git guardrail: blocked "git push".',
  'You do not have authority for this operation - it destroys or publishes state the user owns.',
  'Guardrails are on by default while an unattended ralph run is active; set OMC_GIT_GUARDRAILS=0 to opt out, or ask the user to run this command.',
].join('\n')
// plugins/operating-model/hooks/guard-bash-command.py: the gh-pr-merge-auto
// rule's message plus the suffix main() appends.
const GUARD =
  '`gh pr merge --auto` is refused: in a repository whose default branch has no required status checks, ' +
  '--auto merges at once, before CI finishes. Safe form: watch the checks (`gh pr checks <pr> --watch`), ' +
  'then merge explicitly (`gh pr merge <pr> --squash`). A project that does require checks can turn this ' +
  'rule off in .claude/guard-rules.json. Do not retry through another tool or wrap the command in a ' +
  'script: use the safe form, or report the refusal.'
const GUARD_TIME =
  'This command is refused because the command guard could not finish checking it within 5 seconds. ' +
  'Safe form: split it into smaller commands, or put long content in a file.'
const OTHER = 'Blocked by project policy: writes to /etc are not allowed.'

// Pure logic.

test('built-in patterns name the OMC guardrail and the command guard; anything else is a hook', () => {
  expect(classify(OMC, BUILT_IN)).toBe('OMC guardrail')
  expect(classify(GUARD, BUILT_IN)).toBe('command guard')
  expect(classify(GUARD_TIME, BUILT_IN)).toBe('command guard')
  expect(classify(OTHER, BUILT_IN)).toBe(GENERIC)
})

test('extra patterns are read as Label=expression or a bare expression, invalid ones skipped', () => {
  const { sources, skipped } = parsePatterns([' Worktree guard=isolated in the worktree ', 'policy', '', 'bad=(', 42])
  expect(sources.map(s => s.label)).toEqual(['Worktree guard', GENERIC])
  expect(skipped).toEqual(['bad=('])
  expect(classify('This session is isolated in the worktree /x', [...sources, ...BUILT_IN])).toBe('Worktree guard')
  expect(parsePatterns('not a list')).toEqual({ sources: [], skipped: [] })
})

test('an extra pattern is checked before the built-in ones', () => {
  const { sources } = parsePatterns(['Mine=Git guardrail'])
  expect(classify(OMC, [...sources, ...BUILT_IN])).toBe('Mine')
})

test('a command kind is its program and, for tools with operations, the operation', () => {
  expect(commandKind('git push origin main')).toBe('git push')
  expect(commandKind('git -C /tmp/repo push origin HEAD:refs/heads/x')).toBe('git push')
  expect(commandKind('cd /repo && GIT_TRACE=1 git push')).toBe('git push')
  expect(commandKind('sudo rm -rf build')).toBe('rm')
  expect(commandKind('gh pr merge 3 --auto')).toBe('gh pr')
  expect(commandKind('/usr/bin/git reset --hard')).toBe('git reset')
  expect(commandKind('   ')).toBe('Bash')
})

test('the safe form is the sentence after "Safe form:", periods inside backticks kept', () => {
  expect(safeFormOf(GUARD)).toBe(
    'watch the checks (`gh pr checks <pr> --watch`), then merge explicitly (`gh pr merge <pr> --squash`).',
  )
  expect(safeFormOf('Safe form: run `a.b c` instead')).toBe('run `a.b c` instead')
  expect(safeFormOf('Safe form: run `make. all` first. Then retry.')).toBe('run `make. all` first.')
  expect(safeFormOf(OMC)).toBeNull()
  expect(safeFormOf('Safe form:   ')).toBeNull()
})

test('a refusal is described and summarised for the band', () => {
  const refusal = describe({ tool: 'Bash', toolUseId: 't1', input: { command: 'git push' } }, OMC, BUILT_IN)
  expect(refusal).toEqual({
    toolUseId: 't1',
    tool: 'Bash',
    kind: 'git push',
    source: 'OMC guardrail',
    message: OMC,
    safeForm: null,
  })
  expect(summary(refusal)).toBe('Blocked: git push (OMC guardrail). Needs you.')
  const mcp = describe({ tool: 'mcp__x__write', toolUseId: 't2', input: {} }, OTHER, BUILT_IN)
  expect(summary(mcp)).toBe('Blocked: mcp__x__write (hook). Needs you.')
})

test('long text is truncated with an ellipsis', () => {
  expect(truncate('abc', 5)).toBe('abc')
  expect(truncate('abcdefgh', 5)).toBe('abcd…')
  expect(describe({ tool: 'Bash', toolUseId: 't', input: { command: 'x' } }, 'y'.repeat(900), []).message).toHaveLength(400)
})

function refusal(toolUseId: string, kind: string): Refusal {
  return { toolUseId, tool: 'Bash', kind, source: GENERIC, message: 'm', safeForm: null }
}

test('the waiting list keeps one refusal per kind, newest first, capped', () => {
  let list = addActive([], refusal('a', 'git push'))
  list = addActive(list, refusal('b', 'rm'))
  list = addActive(list, refusal('c', 'git push'))
  expect(list.map(r => r.toolUseId)).toEqual(['c', 'b'])
  expect(clearKind(list, 'git push').map(r => r.toolUseId)).toEqual(['b'])
  expect(dismiss(list, 'b').map(r => r.toolUseId)).toEqual(['c'])
  for (let i = 0; i < 10; i += 1) {
    list = addActive(list, refusal(`k${i}`, `kind ${i}`))
  }
  expect(list).toHaveLength(MAX_ACTIVE)
})

test('the card record keeps the newest MAX_CALLS calls', () => {
  let calls: Record<string, Refusal> = {}
  for (let i = 0; i < MAX_CALLS + 5; i += 1) {
    calls = addCall(calls, refusal(`t${i}`, 'rm'))
  }
  expect(Object.keys(calls)).toHaveLength(MAX_CALLS)
  expect(calls.t0).toBeUndefined()
  expect(calls[`t${MAX_CALLS + 4}`]?.toolUseId).toBe(`t${MAX_CALLS + 4}`)
})

// The mod in a session. The test's own hooks sit beneath the plugin: its
// classic.PreToolUse hook stands for the settings and plugin hooks (a guard's
// exit 2 folds into `deny`), and its tool.call hook stands for the tool.

const BAND = {
  plugin: 'guardrail-notice',
  surface: 'terminal',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isCollapsed: false,
    isWorking: false,
    maxRows: 8,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 8 },
    view: {},
  },
} as const

function rowProps(toolUseId: string, command: string) {
  return {
    tool_use_id: toolUseId,
    tool: 'Bash',
    input: { command },
    isRunning: false,
    isErrored: true,
    isInterrupted: false,
  }
}

const RAN = { stdout: 'ok', stderr: '', interrupted: false }

/** Hooks that refuse the Bash commands in `refuse` (by text) and run the rest. */
function session(on: On, refuse: Map<string, string>) {
  const clock = mock.clock(on)
  const toasts: string[] = []
  const ran: string[] = []
  on('classic.PreToolUse', ($, e, next) => {
    const reason = e.tool === 'Bash' && typeof e.command === 'string' ? refuse.get(e.command) : undefined

    return reason === undefined ? next(e) : { deny: reason }
  })
  on('tool.call', (_, e) => {
    ran.push(String(e.tool === 'Bash' ? e.command : e.tool))

    return { result: RAN }
  })
  on('ui.toast', (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  return { clock, toasts, ran }
}

async function bash($: Engine, id: string, command: string) {
  return $.tool.call({ tool: 'Bash', command, tool_use_id: id })
}

test('a refused git push: the result is unchanged, and the card, band entry and toast appear', async ($, on) => {
  const { clock, toasts, ran } = session(on, new Map([['git push origin main', OMC]]))
  const result = await bash($, 'r1', 'git push origin main')
  await clock.settle()

  // Observe only: the call ends exactly as the refusing hook decided.
  expect(result.isError).toBe(true)
  expect(result.text).toBe(OMC)
  expect(ran).toEqual([])
  expect(toasts).toEqual(['Blocked: git push (OMC guardrail). Needs you.'])

  for (const surface of ['terminal', 'desktop'] as const) {
    const band = await $.ui.mount({ ...BAND, surface })
    expect((await band.find({ type: 'Text', text: 'Blocked: git push (OMC guardrail). Needs you.' }))?.text).toBe(
      'Blocked: git push (OMC guardrail). Needs you.',
    )
    expect(await band.find({ key: 'dismiss-0' })).toBeDefined()
    await band.unmount()

    const card = await $.ui.mount({
      plugin: 'guardrail-notice',
      surface,
      component: 'ToolUse',
      props: rowProps('r1', 'git push origin main'),
    })
    expect(await card.find({ type: 'Text', text: /Git guardrail: blocked "git push"/ })).toBeDefined()
    expect(await card.find({ key: 'dismiss' })).toBeDefined()
    await card.unmount()
  }
})

test('an allowed command produces nothing and its result passes through unchanged', async ($, on) => {
  const { clock, toasts, ran } = session(on, new Map())
  const result = await bash($, 'a1', 'git status')
  await clock.settle()

  expect(result.result).toEqual(RAN)
  expect(result.isError).toBeUndefined()
  expect(ran).toEqual(['git status'])
  expect(toasts).toEqual([])
  const band = await $.ui.mount(BAND)
  expect(await band.find({ type: 'Button' })).toBeUndefined()
  expect(await band.find({ type: 'Text', text: /Blocked/ })).toBeUndefined()
  await band.unmount()
  const card = await $.ui.mount({
    plugin: 'guardrail-notice',
    surface: 'terminal',
    component: 'ToolUse',
    props: rowProps('a1', 'git status'),
  })
  expect(await card.find({ type: 'Text', text: /Blocked/ })).toBeUndefined()
  await card.unmount()
})

test('a later success of the same kind clears the entry; another kind does not', async ($, on) => {
  const refuse = new Map([['git push', OMC]])
  const { clock } = session(on, refuse)
  await bash($, 'r1', 'git push')
  await clock.settle()

  await bash($, 'o1', 'ls')
  await clock.settle()
  const band = await $.ui.mount(BAND)
  expect(await band.find({ type: 'Text', text: /Blocked: git push/ })).toBeDefined()
  await band.unmount()

  refuse.delete('git push')
  await bash($, 'r2', 'git push origin HEAD')
  await clock.settle()
  const after = await $.ui.mount(BAND)
  expect(await after.find({ type: 'Text', text: /Blocked/ })).toBeUndefined()
  await after.unmount()

  // The card stays in the chat, marked cleared, with no Dismiss button.
  const card = await $.ui.mount({
    plugin: 'guardrail-notice',
    surface: 'terminal',
    component: 'ToolUse',
    props: rowProps('r1', 'git push'),
  })
  expect(await card.find({ type: 'Text', text: 'Cleared' })).toBeDefined()
  expect(await card.find({ key: 'dismiss' })).toBeUndefined()
  await card.unmount()
})

test('Dismiss in the band or the card clears the entry', async ($, on) => {
  const { clock } = session(
    on,
    new Map([
      ['git push', OMC],
      ['gh pr merge 3 --auto', GUARD],
    ]),
  )
  await bash($, 'r1', 'git push')
  await bash($, 'r2', 'gh pr merge 3 --auto')
  await clock.settle()

  const band = await $.ui.mount(BAND)
  // Newest first: the command guard's refusal is row 0.
  expect((await band.findAll({ type: 'Text', text: /^Blocked/ })).map(t => t.text)).toEqual([
    'Blocked: gh pr (command guard). Needs you.',
    'Blocked: git push (OMC guardrail). Needs you.',
  ])
  await band.press({ key: 'dismiss-0' })
  expect((await band.findAll({ type: 'Text', text: /^Blocked/ })).map(t => t.text)).toEqual([
    'Blocked: git push (OMC guardrail). Needs you.',
  ])
  await band.unmount()

  const card = await $.ui.mount({
    plugin: 'guardrail-notice',
    surface: 'terminal',
    component: 'ToolUse',
    props: rowProps('r1', 'git push'),
  })
  await card.press({ key: 'dismiss' })
  await card.unmount()
  const empty = await $.ui.mount(BAND)
  expect(await empty.find({ type: 'Text', text: /Blocked/ })).toBeUndefined()
  await empty.unmount()

  // The command guard's card names its safe form.
  const guardCard = await $.ui.mount({
    plugin: 'guardrail-notice',
    surface: 'terminal',
    component: 'ToolUse',
    props: rowProps('r2', 'gh pr merge 3 --auto'),
  })
  expect(await guardCard.find({ type: 'Text', text: /^Safe form: watch the checks/ })).toBeDefined()
  await guardCard.unmount()
})

test('with toast off, a refusal raises no toast but still shows in the band', { options: { toast: false } }, async ($, on) => {
  const { clock, toasts } = session(on, new Map([['git push', OMC]]))
  await bash($, 'r1', 'git push')
  await clock.settle()
  expect(toasts).toEqual([])
  const band = await $.ui.mount(BAND)
  expect(await band.find({ type: 'Text', text: /Blocked: git push/ })).toBeDefined()
  await band.unmount()
})

test('an extra pattern from settings names the source', { options: { patterns: ['Policy=project policy'] } }, async ($, on) => {
  const { clock, toasts } = session(on, new Map([['tee /etc/x', OTHER]]))
  await bash($, 'r1', 'tee /etc/x')
  await clock.settle()
  expect(toasts).toEqual(['Blocked: tee (Policy). Needs you.'])
})
