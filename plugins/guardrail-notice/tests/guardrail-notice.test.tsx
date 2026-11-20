import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import {
  addActive,
  BUILT_IN,
  callKey,
  classify,
  clearKey,
  commandKinds,
  describe,
  dismiss,
  GENERIC,
  isShown,
  labelOf,
  MAX_ACTIVE,
  MAX_CALLS,
  namedOperation,
  normalizeCommand,
  parsePatterns,
  safeFormOf,
  summary,
  trackCall,
  truncate,
} from '../hooks/logic'
import { onCall, onDecision, replayCall, replayDecision } from '../hooks/observe'
import type { Refusal } from '../types'

// Refusal texts as the real hooks write them to stderr (exit 2).
// OMC 5.8.6 scripts/git-guardrails.mjs, guardMessage(label, 'ralph').
function omc(label: string): string {
  return [
    `Git guardrail: blocked "${label}".`,
    'You do not have authority for this operation - it destroys or publishes state the user owns.',
    'Guardrails are on by default while an unattended ralph run is active; set OMC_GIT_GUARDRAILS=0 to opt out, or ask the user to run this command.',
  ].join('\n')
}
const OMC = omc('git push')
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

// Naming.

test('built-in patterns name the OMC guardrail and the command guard; anything else is a hook', () => {
  expect(classify(OMC, BUILT_IN)).toBe('OMC guardrail')
  expect(classify(GUARD, BUILT_IN)).toBe('command guard')
  expect(classify(GUARD_TIME, BUILT_IN)).toBe('command guard')
  expect(classify(OTHER, BUILT_IN)).toBe(GENERIC)
})

test('patterns are matched against the first 2000 characters only', () => {
  const late = `${'x'.repeat(2500)} Git guardrail: blocked "git push".`
  expect(classify(late, BUILT_IN)).toBe(GENERIC)
})

test('extra patterns: Label=body or a bare body; a body is a substring unless it starts with re:', () => {
  const { sources, skipped } = parsePatterns([
    ' Worktree guard=isolated in the worktree ',
    'policy',
    '',
    'Dot=a.b',
    'bad=re:(',
    'slow=re:(a+)+$',
    're:(x*){2,}',
    'none=re:',
    'Re=re:^Blocked \\w+ policy',
    42,
  ])
  expect(sources.map(s => s.label)).toEqual(['Worktree guard', GENERIC, 'Dot', 'Re'])
  expect(skipped.map(s => s.entry)).toEqual(['bad=re:(', 'slow=re:(a+)+$', 're:(x*){2,}', 'none=re:'])
  expect(skipped.map(s => s.why)).toEqual([
    'not a valid regular expression',
    'nested quantifier (can take exponential time)',
    'nested quantifier (can take exponential time)',
    'empty expression',
  ])
  expect(classify('This session is isolated in the worktree /x', [...sources, ...BUILT_IN])).toBe('Worktree guard')
  expect(classify('THIS SESSION IS ISOLATED IN THE WORKTREE', [...sources, ...BUILT_IN])).toBe('Worktree guard')
  expect(parsePatterns('not a list')).toEqual({ sources: [], skipped: [] })
})

test('a substring pattern matches literally; an re: pattern is a regular expression', () => {
  const { sources } = parsePatterns(['Dot=a.b', 'Paren=f(x)', 'Re=re:^Blocked \\w+ policy$'])
  const [dot, paren, re] = sources.map(s => [s])
  expect(classify('see a.b here', dot as never)).toBe('Dot')
  expect(classify('see aXb here', dot as never)).toBe(GENERIC)
  expect(classify('call f(x) now', paren as never)).toBe('Paren')
  expect(classify('call fx now', paren as never)).toBe(GENERIC)
  expect(classify('Blocked my policy', re as never)).toBe('Re')
  expect(classify('Blocked my  policy', re as never)).toBe(GENERIC)
})

test('trackCall keeps the newest MAX_CALLS ids and reports the evicted ones', () => {
  let ids: string[] = []
  const evicted: string[] = []
  for (let i = 0; i < MAX_CALLS + 3; i += 1) {
    const tracked = trackCall(ids, `c${i}`)
    ids = tracked.ids
    evicted.push(...tracked.evicted)
  }
  expect(ids).toHaveLength(MAX_CALLS)
  expect(ids[0]).toBe(`c${MAX_CALLS + 2}`)
  expect(evicted).toEqual(['c0', 'c1', 'c2'])
  expect(trackCall(['a', 'b'], 'b')).toEqual({ ids: ['b', 'a'], evicted: [] })
})

test('an extra pattern is checked before the built-in ones', () => {
  const { sources } = parsePatterns(['Mine=Git guardrail'])
  expect(classify(OMC, [...sources, ...BUILT_IN])).toBe('Mine')
})

test('the operation is taken from the refusal when it names one', () => {
  expect(namedOperation(OMC)).toBe('git push')
  expect(namedOperation(omc('git reset --hard'))).toBe('git reset --hard')
  expect(namedOperation(GUARD)).toBe('gh pr merge --auto')
  expect(namedOperation(GUARD_TIME)).toBeNull()
  expect(namedOperation(OTHER)).toBeNull()
})

// Command kinds.

test('a command kind is its program and, for tools with operations, the operation', () => {
  expect(commandKinds('git push origin main')).toEqual(['git push'])
  expect(commandKinds('git -C /tmp/repo push origin HEAD:refs/heads/x')).toEqual(['git push'])
  expect(commandKinds('cd /repo && GIT_TRACE=1 git push')).toEqual(['git push'])
  expect(commandKinds('sudo rm -rf build')).toEqual(['rm'])
  expect(commandKinds('/usr/bin/git reset --hard')).toEqual(['git reset'])
  expect(commandKinds('   ')).toEqual([])
})

test('every command of a chain is read, and the values of -R/--repo are skipped', () => {
  expect(commandKinds('git add -A && git commit -m x && git push')).toEqual(['git add', 'git commit', 'git push'])
  expect(commandKinds('gh -R owner/repo pr merge 3')).toEqual(['gh pr'])
  expect(commandKinds('gh --repo owner/repo pr view')).toEqual(['gh pr'])
  expect(commandKinds('make test 2>&1 | tee log.txt')).toEqual(['make', 'tee'])
})

test('a quoted separator does not split, and bash -c / sh -c are read inside', () => {
  expect(commandKinds('git commit -m "fix; then git push && done"')).toEqual(['git commit'])
  expect(commandKinds("echo 'a | b'")).toEqual(['echo'])
  expect(commandKinds('bash -c "git add . && git push"')).toEqual(['git add', 'git push'])
  expect(commandKinds("sh -lc 'git push --force'")).toEqual(['git push'])
})

test('a chained command refused by OMC is labelled with the operation the refusal names', () => {
  const input = { command: 'git add -A && git commit -m x && git push' }
  expect(labelOf('Bash', input, OMC)).toBe('git push')
  // Without a name in the refusal, a chain shows its (shortened) command.
  expect(labelOf('Bash', input, OTHER)).toBe('git add -A && git commit -m x && git push')
  expect(labelOf('Bash', { command: `git add -A && ${'x'.repeat(100)}` }, OTHER)).toHaveLength(60)
  expect(labelOf('Bash', { command: 'git push origin main' }, OTHER)).toBe('git push')
  expect(labelOf('Write', { file_path: '/a' }, OTHER)).toBe('Write')
})

// Clearing keys.

test('the clear key is the normalized command: spacing does not matter, quoting does', () => {
  expect(normalizeCommand('git   push  origin main')).toBe('git push origin main')
  expect(callKey('Bash', { command: 'git push  origin main' })).toBe(callKey('Bash', { command: 'git push origin main' }))
  expect(callKey('Bash', { command: 'echo "a b"' })).not.toBe(callKey('Bash', { command: 'echo a b' }))
  expect(callKey('Bash', { command: 'git push', description: 'one' })).toBe(
    callKey('Bash', { command: 'git push', description: 'two' }),
  )
})

test('a harmless sibling of a refused command never has its key', () => {
  const pairs: [string, string][] = [
    ['git branch -D x', 'git branch'],
    ['git reset --hard', 'git reset file.txt'],
    ['git checkout .', 'git checkout -b feature'],
    ['git clean -f', 'git clean -n'],
    ['git push --force origin main', 'git push origin feature'],
  ]
  for (const [refused, sibling] of pairs) {
    expect(callKey('Bash', { command: sibling })).not.toBe(callKey('Bash', { command: refused }))
  }
})

test('for other tools the key is the tool and its whole input, in any key order', () => {
  expect(callKey('Write', { file_path: '/b', content: 'x' })).not.toBe(callKey('Write', { file_path: '/a', content: 'x' }))
  expect(callKey('Write', { content: 'x', file_path: '/a', tool_use_id: 't9' })).toBe(
    callKey('Write', { file_path: '/a', content: 'x', tool_use_id: 't1' }),
  )
  expect(callKey('Edit', { file_path: '/a' })).not.toBe(callKey('Write', { file_path: '/a' }))
})

// Safe form, describe, lists.

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
    key: callKey('Bash', { command: 'git push' }),
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

function refusal(toolUseId: string, kind: string, key = kind): Refusal {
  return { toolUseId, tool: 'Bash', kind, key, source: GENERIC, message: 'm', safeForm: null }
}

test('the waiting list keeps one refusal per call key, newest first, capped', () => {
  let list = addActive([], refusal('a', 'git push'))
  list = addActive(list, refusal('b', 'rm'))
  list = addActive(list, refusal('c', 'git push'))
  expect(list.map(r => r.toolUseId)).toEqual(['c', 'b'])
  expect(isShown(list, refusal('d', 'rm', 'rm -rf other'))).toBe(true)
  expect(isShown(list, refusal('d', 'git reset'))).toBe(false)
  expect(clearKey(list, 'git push').map(r => r.toolUseId)).toEqual(['b'])
  expect(dismiss(list, 'b').map(r => r.toolUseId)).toEqual(['c'])
  for (let i = 0; i < 10; i += 1) {
    list = addActive(list, refusal(`k${i}`, `kind ${i}`))
  }
  expect(list).toHaveLength(MAX_ACTIVE)
})


// The observers return the very object next resolved to. They are called here
// with a stand-in `$` whose clock only records what was scheduled: the work
// itself is the listener's, which the session tests below exercise.

function fakeNext(result: object) {
  let calls = 0
  const next = Object.assign(
    async () => {
      calls += 1

      return result
    },
    { called: false },
  )

  return { next, calls: () => calls }
}

function fakeEngine(onAfter: () => void = () => {}) {
  let scheduled = 0
  const $ = {
    clock: {
      after: () => {
        scheduled += 1
        onAfter()

        return { cancel: () => {} }
      },
    },
  }

  return { $, scheduled: () => scheduled }
}

const ENV = { tool: 'Bash', tool_use_id: 't1', command: 'git push' }

test('allow, ask, deny, updatedInput and additionalContext pass through as the same object', async () => {
  const decisions: object[] = [
    { allow: true, additionalContext: ['x'] },
    { ask: 'are you sure?' },
    { allow: true, updatedInput: { command: 'git push --dry-run' } },
    { deny: OMC },
    {},
  ]
  for (const decision of decisions) {
    const engine = fakeEngine()
    const { next } = fakeNext(decision)
    const returned = await onDecision(engine.$ as never, ENV as never, next as never)
    expect(returned === decision).toBe(true)
    // Only a deny schedules any work.
    expect(engine.scheduled()).toBe('deny' in decision ? 1 : 0)
  }
})

test('the tool.call observer returns the same object and reports only a success', async () => {
  const results: [object, boolean][] = [
    [{ result: { stdout: 'ok' }, text: 'ok', ref: 3 }, true],
    [{ isError: true, result: 'boom', text: 'boom' }, false],
    [{ deny: 'no' }, false],
  ]
  for (const [result, isSuccess] of results) {
    const engine = fakeEngine()
    const { next } = fakeNext(result)
    const returned = await onCall(engine.$ as never, ENV as never, next as never)
    expect(returned === result).toBe(true)
    expect(engine.scheduled()).toBe(isSuccess ? 1 : 0)
  }
})

test('when the hook throws after next, the .catch handler calls next and returns what it resolves to', async () => {
  const failing = fakeEngine(() => {
    throw new Error('timer refused')
  })
  const deny = { deny: OMC }
  const decision = fakeNext(deny)
  await expect(onDecision(failing.$ as never, ENV as never, decision.next as never)).rejects.toThrow('timer refused')
  const replayed = await replayDecision({} as never, ENV as never, Object.assign(decision.next, { called: true }) as never)
  expect(replayed === deny).toBe(true)
  expect(decision.calls()).toBe(2)

  const result = { result: { stdout: 'ok' } }
  const call = fakeNext(result)
  await expect(onCall(failing.$ as never, ENV as never, call.next as never)).rejects.toThrow('timer refused')
  expect((await replayCall({} as never, ENV as never, call.next as never)) === result).toBe(true)
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

type Decide = (command: string) => object | undefined

/** Hooks that answer each Bash command's PreToolUse with `decide`, and run what goes on. */
function session(on: On, decide: Decide) {
  const clock = mock.clock(on)
  const toasts: string[] = []
  const ran: string[] = []
  const logs: { text: string; to: string }[] = []
  on('classic.PreToolUse', ($, e, next) => {
    const decision = e.tool === 'Bash' && typeof e.command === 'string' ? decide(e.command) : undefined

    return decision === undefined ? next(e) : decision
  })
  on('tool.call', (_, e) => {
    ran.push(String(e.tool === 'Bash' ? e.command : e.tool))

    return { result: RAN }
  })
  on('ui.toast', (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })
  on('ui.log', (_, e) => {
    logs.push({ text: e.text, to: String(e.to) })

    return { value: undefined }
  })

  return { clock, toasts, ran, logs }
}

function refusing(map: Map<string, string>): Decide {
  return command => {
    const reason = map.get(command)

    return reason === undefined ? undefined : { deny: reason }
  }
}

async function bash($: Engine, id: string, command: string) {
  return $.tool.call({ tool: 'Bash', command, tool_use_id: id })
}

async function bandLines($: Engine): Promise<string[]> {
  const band = await $.ui.mount(BAND)
  const lines = (await band.findAll({ type: 'Text', text: /^Blocked/ })).map(t => t.text ?? '')
  await band.unmount()

  return lines
}

test('a refused git push: the result is unchanged, and the card, band entry and toast appear', async ($, on) => {
  const { clock, toasts, ran } = session(on, refusing(new Map([['git push origin main', OMC]])))
  const result = await bash($, 'r1', 'git push origin main')
  await clock.settle()

  // Observe only: the call ends exactly as the refusing hook decided.
  expect(result.isError).toBe(true)
  expect(result.text).toBe(OMC)
  expect(ran).toEqual([])
  expect(toasts).toEqual(['Blocked: git push (OMC guardrail). Needs you.'])

  for (const surface of ['terminal', 'desktop', 'mobile'] as const) {
    const band = await $.ui.mount({ ...BAND, surface })
    expect((await band.find({ type: 'Text', text: /^Blocked/ }))?.text).toBe(
      'Blocked: git push (OMC guardrail). Needs you.',
    )
    expect(await band.find({ key: 'dismiss-0' })).toBeDefined()
    await band.unmount()

    const card = await $.ui.mount({
      plugin: 'guardrail-notice',
      surface,
      component: 'ToolUse',
      requestId: 'r1',
      props: rowProps('r1', 'git push origin main'),
    })
    // The border sits on the outermost Box, the one that holds the row.
    expect(await card.drawn()).toMatchObject({ type: 'Box', props: { borderStyle: 'round' } })
    expect(await card.find({ type: 'Text', text: /Git guardrail: blocked "git push"/ })).toBeDefined()
    expect(await card.find({ key: 'dismiss' })).toBeDefined()
    await card.unmount()
  }
})

test('a chained command refused by OMC shows the operation OMC named', async ($, on) => {
  const chain = 'git add -A && git commit -m x && git push'
  const { clock, toasts } = session(on, refusing(new Map([[chain, OMC]])))
  await bash($, 'r1', chain)
  await clock.settle()
  expect(toasts).toEqual(['Blocked: git push (OMC guardrail). Needs you.'])
  // A bare `git push` is not the refused command, so it does not clear it.
  await bash($, 'o1', 'git push')
  await clock.settle()
  expect(await bandLines($)).toEqual(['Blocked: git push (OMC guardrail). Needs you.'])
})

test('an allowed command produces nothing and its result passes through unchanged', async ($, on) => {
  const { clock, toasts, ran } = session(on, () => undefined)
  const result = await bash($, 'a1', 'git status')
  await clock.settle()

  expect(result.result).toEqual(RAN)
  expect(result.isError).toBeUndefined()
  expect(ran).toEqual(['git status'])
  expect(toasts).toEqual([])
  const band = await $.ui.mount(BAND)
  expect(await band.find({ type: 'Button' })).toBeUndefined()
  await band.unmount()
  const card = await $.ui.mount({
    plugin: 'guardrail-notice',
    surface: 'terminal',
    component: 'ToolUse',
    requestId: 'a1',
      props: rowProps('a1', 'git status'),
  })
  expect(await card.find({ type: 'Text', text: /Blocked/ })).toBeUndefined()
  await card.unmount()
})

test("an allow with updatedInput and additionalContext still rewrites the call, and nothing is shown", async ($, on) => {
  const { clock, toasts, ran } = session(on, command =>
    command === 'git push' ? { allow: true, updatedInput: { command: 'git push --dry-run' }, additionalContext: ['x'] } : undefined,
  )
  const result = await bash($, 'a1', 'git push')
  await clock.settle()
  expect(ran).toEqual(['git push --dry-run'])
  expect(result.result).toEqual(RAN)
  expect(toasts).toEqual([])
  expect(await bandLines($)).toEqual([])
})

test('only exactly the refused command, run again successfully, clears the entry', async ($, on) => {
  const refused = new Map([
    ['git push --force origin main', omc('git push')],
    ['git branch -D x', omc('git branch -D')],
  ])
  const { clock } = session(on, refusing(refused))
  await bash($, 'r1', 'git push --force origin main')
  await bash($, 'r2', 'git branch -D x')
  await clock.settle()

  for (const sibling of ['git push origin feature', 'git branch', 'ls']) {
    await bash($, `s-${sibling}`, sibling)
  }
  await clock.settle()
  expect(await bandLines($)).toEqual([
    'Blocked: git branch -D (OMC guardrail). Needs you.',
    'Blocked: git push (OMC guardrail). Needs you.',
  ])

  refused.delete('git push --force origin main')
  await bash($, 'r3', 'git  push --force origin main')
  await clock.settle()
  expect(await bandLines($)).toEqual(['Blocked: git branch -D (OMC guardrail). Needs you.'])

  // The card stays in the chat, marked cleared, with no Dismiss button.
  const card = await $.ui.mount({
    plugin: 'guardrail-notice',
    surface: 'terminal',
    component: 'ToolUse',
    requestId: 'r1',
      props: rowProps('r1', 'git push --force origin main'),
  })
  expect(await card.find({ type: 'Text', text: 'Cleared' })).toBeDefined()
  expect(await card.find({ key: 'dismiss' })).toBeUndefined()
  await card.unmount()
})

test('Dismiss in the band or the card clears the entry', async ($, on) => {
  const { clock } = session(
    on,
    refusing(
      new Map([
        ['git push', OMC],
        ['gh pr merge 3 --auto', GUARD],
      ]),
    ),
  )
  await bash($, 'r1', 'git push')
  await bash($, 'r2', 'gh pr merge 3 --auto')
  await clock.settle()

  const band = await $.ui.mount(BAND)
  // Newest first: the command guard's refusal is row 0, named by the guard.
  expect((await band.findAll({ type: 'Text', text: /^Blocked/ })).map(t => t.text)).toEqual([
    'Blocked: gh pr merge --auto (command guard). Needs you.',
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
    requestId: 'r1',
      props: rowProps('r1', 'git push'),
  })
  await card.press({ key: 'dismiss' })
  await card.unmount()
  expect(await bandLines($)).toEqual([])

  // The command guard's card names its safe form.
  const guardCard = await $.ui.mount({
    plugin: 'guardrail-notice',
    surface: 'terminal',
    component: 'ToolUse',
    requestId: 'r2',
      props: rowProps('r2', 'gh pr merge 3 --auto'),
  })
  expect(await guardCard.find({ type: 'Text', text: /^Safe form: watch the checks/ })).toBeDefined()
  await guardCard.unmount()
})

test('a second refusal of a kind already shown raises no second toast', async ($, on) => {
  const { clock, toasts } = session(
    on,
    refusing(
      new Map([
        ['git push origin a', OMC],
        ['git push origin b', OMC],
      ]),
    ),
  )
  await bash($, 'r1', 'git push origin a')
  await clock.settle()
  await bash($, 'r2', 'git push origin b')
  await clock.settle()
  expect(toasts).toEqual(['Blocked: git push (OMC guardrail). Needs you.'])
  expect(await bandLines($)).toHaveLength(2)
})

test('with toast off, a refusal raises no toast but still shows in the band', { options: { toast: false } }, async ($, on) => {
  const { clock, toasts } = session(on, refusing(new Map([['git push', OMC]])))
  await bash($, 'r1', 'git push')
  await clock.settle()
  expect(toasts).toEqual([])
  expect(await bandLines($)).toEqual(['Blocked: git push (OMC guardrail). Needs you.'])
})

test('an extra pattern from settings names the source', { options: { patterns: ['Policy=project policy'] } }, async ($, on) => {
  const { clock, toasts } = session(on, refusing(new Map([['tee /etc/x', OTHER]])))
  await bash($, 'r1', 'tee /etc/x')
  await clock.settle()
  expect(toasts).toEqual(['Blocked: tee (Policy). Needs you.'])
})

test('a skipped pattern is reported once, in the transcript', { options: { patterns: ['slow=re:(a+)+$', 'ok=fine'] } }, async ($, on) => {
  const { logs } = session(on, () => undefined)
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  expect(logs).toEqual([
    {
      text: 'guardrail-notice: pattern skipped (nested quantifier (can take exponential time)): slow=re:(a+)+$',
      to: 'transcript',
    },
  ])
})

test('only the newest MAX_CALLS refused calls keep a card; older ones are dropped', async ($, on) => {
  const map = new Map<string, string>()
  for (let i = 0; i < MAX_CALLS + 2; i += 1) {
    map.set(`rm -rf d${i}`, OTHER)
  }
  const { clock } = session(on, refusing(map))
  for (let i = 0; i < MAX_CALLS + 2; i += 1) {
    await bash($, `r${i}`, `rm -rf d${i}`)
    await clock.settle()
  }
  const card = async (i: number) => {
    const mounted = await $.ui.mount({
      plugin: 'guardrail-notice',
      surface: 'terminal',
      component: 'ToolUse',
      requestId: `r${i}`,
      props: rowProps(`r${i}`, `rm -rf d${i}`),
    })
    const found = await mounted.find({ type: 'Text', text: /^Blocked/ })
    await mounted.unmount()

    return found !== undefined
  }
  expect(await card(0)).toBe(false)
  expect(await card(1)).toBe(false)
  expect(await card(2)).toBe(true)
  expect(await card(MAX_CALLS + 1)).toBe(true)
})

test('an identical call that succeeds while a refusal is recorded leaves no stale entry', async ($, on) => {
  let n = 0
  const { clock } = session(on, command => (command === 'git push' && n++ === 0 ? { deny: OMC } : undefined))
  // While the refusal's entry is being written, the same command succeeds and
  // its clear runs: it finds nothing waiting yet, so record must clear again.
  let isInjected = false
  on('state.set', { plugin: 'guardrail-notice', key: 'call' }, async (_, e, next) => {
    const result = await next(e)
    if (!isInjected) {
      isInjected = true
      await bash($, 'r2', 'git push')
      await clock.settle()
    }

    return result
  })
  await bash($, 'r1', 'git push')
  await clock.settle()
  expect(isInjected).toBe(true)
  expect(await bandLines($)).toEqual([])
})
