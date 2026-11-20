import type { ModelUsage, On, SessionMessage, TurnUsage } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

import {
  add,
  addTokens,
  bandText,
  chooseBudget,
  compact,
  level,
  malformed,
  parseBudget,
  percent,
  total,
  ZERO,
} from '../hooks/budget'
import type { Spend } from '../types'

const BAND = {
  plugin: 'token-budget',
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

const LINE = { type: 'Text', text: /^Budget / } as const

function usage(input: number, output: number, cacheRead: number, cacheWrite: number): TurnUsage {
  return {
    input_tokens: input,
    output_tokens: output,
    cache_read_input_tokens: cacheRead,
    cache_creation_input_tokens: cacheWrite,
    model: 'claude-test',
  }
}

// The pure logic.

test('add sums all four counts and counts the turn', () => {
  const one = add(ZERO, usage(10, 20, 300, 4000))
  expect(one).toEqual({ input: 10, output: 20, cacheRead: 300, cacheWrite: 4000, turns: 1 })
  const two = add(one, usage(1, 2, 3, 4))
  expect(two).toEqual({ input: 11, output: 22, cacheRead: 303, cacheWrite: 4004, turns: 2 })
  expect(total(two)).toBe(11 + 22 + 303 + 4004)
})

test('addTokens sums all four counts and leaves the turn count alone', () => {
  const one = add(ZERO, usage(1, 1, 1, 1))
  expect(addTokens(one, usage(10, 20, 300, 4000))).toEqual({
    input: 11,
    output: 21,
    cacheRead: 301,
    cacheWrite: 4001,
    turns: 1,
  })
})

test('parseBudget reads a number of at least 1 the way OMC reads its variable', () => {
  expect(parseBudget('1000000')).toBe(1_000_000)
  expect(parseBudget('1e6')).toBe(1_000_000)
  expect(parseBudget(' 500000 ')).toBe(500_000)
  expect(parseBudget(250_000)).toBe(250_000)
  expect(parseBudget(1)).toBe(1)
  for (const bad of [undefined, null, '', '   ', '0', 0, 0.5, '0.5', -5, '-1', 'lots', NaN, Infinity, {}]) {
    expect(parseBudget(bad)).toBeNull()
  }
})

test('the setting wins over the variable; either alone is used; neither is none', () => {
  expect(chooseBudget(500_000, '2000000')).toBe(500_000)
  expect(chooseBudget(0, '2000000')).toBe(2_000_000)
  expect(chooseBudget(undefined, '2000000')).toBe(2_000_000)
  expect(chooseBudget(750_000, undefined)).toBe(750_000)
  expect(chooseBudget(0, undefined)).toBeNull()
  expect(chooseBudget(0, 'nope')).toBeNull()
})

test('malformed names a set value that cannot be read, and nothing else', () => {
  expect(malformed(0, undefined)).toBeNull()
  expect(malformed(0, '')).toBeNull()
  expect(malformed(500_000, 'lots')).toBeNull()
  expect(malformed(0, '1e6')).toBeNull()
  expect(malformed(0, 'lots')).toBe('OMC_RUN_BUDGET_TOKENS="lots"')
  expect(malformed(-5, '1e6')).toBe('the budget setting -5')
  expect(malformed(0.5, undefined)).toBe('the budget setting 0.5')
})

test('compact writes counts as the band shows them, rounded down', () => {
  expect(compact(0)).toBe('0')
  expect(compact(950)).toBe('950')
  expect(compact(1_000)).toBe('1k')
  expect(compact(412_999)).toBe('412k')
  expect(compact(999_600)).toBe('999k')
  expect(compact(1_000_000)).toBe('1.0M')
  expect(compact(1_099_999)).toBe('1.0M')
  expect(compact(12_480_000)).toBe('12.4M')
  expect(compact(999_999_999)).toBe('999.9M')
  expect(compact(1_250_000_000)).toBe('1.2B')
})

test('the band text matches the ticket example', () => {
  expect(bandText(412_000, 1_000_000)).toBe('Budget 412k / 1.0M (41%)')
})

test('percent rounds down, so 90% and 100% appear only with their level', () => {
  expect(percent(899_999, 1_000_000)).toBe(89)
  expect(level(899_999, 1_000_000)).toBe('ok')
  expect(percent(900_000, 1_000_000)).toBe(90)
  expect(level(900_000, 1_000_000)).toBe('warning')
  expect(percent(999_999, 1_000_000)).toBe(99)
  expect(level(999_999, 1_000_000)).toBe('warning')
  expect(level(1_000_000, 1_000_000)).toBe('alert')
  expect(bandText(1_500_000, 1_000_000)).toBe('Budget 1.5M / 1.0M (150%)')
  expect(level(1_500_000, 1_000_000)).toBe('alert')
})

// Mutation check: each mutant below breaks one rule the band depends on. The
// checks that guard the real logic must reject every one of them, or the
// tests above would pass a broken mod.

type Logic = {
  total: (spend: Spend) => number
  level: (spent: number, budget: number) => string
  chooseBudget: (setting: unknown, env: string | undefined) => number | null
  add: (spend: Spend, usage: ModelUsage) => Spend
  addTokens: (spend: Spend, usage: ModelUsage) => Spend
  compact: (tokens: number) => string
}

function failures(logic: Logic): string[] {
  const found: string[] = []
  const spend: Spend = { input: 1, output: 2, cacheRead: 30, cacheWrite: 400, turns: 1 }
  if (logic.total(spend) !== 433) found.push('total')
  if (logic.level(899_999, 1_000_000) !== 'ok') found.push('below 90')
  if (logic.level(900_000, 1_000_000) !== 'warning') found.push('at 90')
  if (logic.level(1_000_000, 1_000_000) !== 'alert') found.push('at 100')
  if (logic.chooseBudget(500_000, '2000000') !== 500_000) found.push('setting wins')
  if (logic.chooseBudget(0, '2000000') !== 2_000_000) found.push('env fallback')
  if (logic.chooseBudget(0, undefined) !== null) found.push('no budget')
  if (logic.chooseBudget(0, '0.5') !== null) found.push('budget below 1')
  if (logic.total(logic.add(ZERO, usage(5, 6, 70, 800))) !== 881) found.push('add')
  const compacted = logic.addTokens(spend, usage(5, 6, 70, 800))
  if (logic.total(compacted) !== 433 + 881 || compacted.turns !== 1) found.push('addTokens')
  if (logic.compact(999_600) !== '999k') found.push('compact rounds up')
  if (logic.compact(1_250_000_000) !== '1.2B') found.push('compact tiers')

  return found
}

test('mutation check: the real logic passes and every mutant is caught', () => {
  const real: Logic = { total, level, chooseBudget, add, addTokens, compact }
  expect(failures(real)).toEqual([])

  const mutants: Record<string, Logic> = {
    'total drops cache reads': { ...real, total: s => s.input + s.output + s.cacheWrite },
    'total drops cache writes': { ...real, total: s => s.input + s.output + s.cacheRead },
    'warning only above 90': { ...real, level: (a, b) => (a >= b ? 'alert' : a > b * 0.9 ? 'warning' : 'ok') },
    'alert only above 100': { ...real, level: (a, b) => (a > b ? 'alert' : a >= b * 0.9 ? 'warning' : 'ok') },
    'variable wins over setting': { ...real, chooseBudget: (s, v) => parseBudget(v) ?? parseBudget(s) },
    'zero setting counts as a budget': {
      ...real,
      chooseBudget: (s, v) => (typeof s === 'number' ? s : parseBudget(v)),
    },
    'a fraction counts as a budget': {
      ...real,
      chooseBudget: (s, v) => {
        const n = Number(v)
        return parseBudget(s) ?? (n > 0 ? n : null)
      },
    },
    'add ignores output': { ...real, add: (s, u) => ({ ...add(s, u), output: s.output }) },
    'a compaction counts as a turn': { ...real, addTokens: add },
    'compact rounds to nearest': {
      ...real,
      compact: n => (n >= 999_500 ? `${(n / 1e6).toFixed(1)}M` : n >= 1_000 ? `${Math.round(n / 1_000)}k` : String(n)),
    },
    'compact has no B tier': {
      ...real,
      compact: n => (n >= 1e6 ? `${(Math.floor(n / 1e5) / 10).toFixed(1)}M` : compact(n)),
    },
  }
  for (const [name, mutant] of Object.entries(mutants)) {
    expect(failures(mutant).length > 0, `mutant survived: ${name}`).toBe(true)
  }
})

// The mod in a session. The test's own hooks stand for the engine: they answer
// session.start, turn.complete, session.compact, session.end and ui.toast, and
// `mock.env` answers `$.env.get`. `$.state` is the kit's own.

const MESSAGES: SessionMessage[] = [{ role: 'user', text: 'hello', toolUses: [] }]

function engine(on: On, env: Record<string, string>, compaction?: TurnUsage) {
  const toasts: string[] = []
  mock.env(on, env)
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.complete', () => ({ text: '' }))
  on('session.compact', () => (compaction === undefined ? { skip: 'test' } : { messages: MESSAGES, usage: compaction }))
  on('session.end', (_, e) => ({ sessionId: e.sessionId }))
  on('ui.toast', (_, e) => {
    toasts.push(e.text)

    return { value: undefined }
  })

  return { toasts }
}

const START = { cwd: '/', surface: 'terminal', isInteractive: true } as const

function turn(n: number, spent: TurnUsage, agentId?: string) {
  return {
    answer: '',
    durationMs: 1,
    isAborted: false,
    turnId: `t${n}`,
    reason: 'answer',
    usage: spent,
    ...(agentId === undefined ? {} : { agentId }),
  } as const
}

function end(reason: 'clear' | 'resume' | 'prompt_input_exit' | 'other') {
  return { reason, sessionId: 's1', resume: { id: 's1' } } as const
}

test('with no budget set, nothing is drawn', async ($, on) => {
  engine(on, {})
  await $.session.start(START)
  await $.turn.complete(turn(1, usage(100, 100, 100, 100)))
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text' })).toBeUndefined()
  await ui.unmount()
})

test('the variable sets the budget; main and subagent turns both count', async ($, on) => {
  engine(on, { OMC_RUN_BUDGET_TOKENS: '1000000' })
  await $.session.start(START)
  await $.turn.complete(turn(1, usage(2_000, 10_000, 300_000, 50_000)))
  await $.turn.complete(turn(2, usage(1_000, 9_000, 40_000, 0), 'agent-1'))

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    const text = await ui.find(LINE)
    expect(text?.text).toBe('Budget 412k / 1.0M (41%)')
    expect(text?.props.color).toBeUndefined()
    expect(text?.props.bold).toBe(false)
    await ui.unmount()
  }
})

test('the setting wins over the variable', { options: { budget: 500_000 } }, async ($, on) => {
  engine(on, { OMC_RUN_BUDGET_TOKENS: '1000000' })
  await $.session.start(START)
  await $.turn.complete(turn(1, usage(0, 100_000, 0, 0)))
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find(LINE))?.text).toBe('Budget 100k / 500k (20%)')
  await ui.unmount()
})

test('the band warns at 90% and alerts, bold, at 100%', { options: { budget: 1_000_000 } }, async ($, on) => {
  engine(on, {})
  await $.session.start(START)

  await $.turn.complete(turn(1, usage(0, 0, 900_000, 0)))
  let ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  let text = await ui.find(LINE)
  expect(text?.text).toBe('Budget 900k / 1.0M (90%)')
  expect(text?.props.color).toBe('warning')
  expect(text?.props.bold).toBe(false)
  await ui.unmount()

  await $.turn.complete(turn(2, usage(0, 100_000, 0, 0)))
  ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  text = await ui.find(LINE)
  expect(text?.text).toBe('Budget 1.0M / 1.0M (100%)')
  expect(text?.props.color).toBe('error')
  expect(text?.props.bold).toBe(true)
  await ui.unmount()
})

test('a survey hides the band', { options: { budget: 1_000_000 } }, async ($, on) => {
  engine(on, {})
  await $.session.start(START)
  await $.turn.complete(turn(1, usage(0, 100_000, 0, 0)))
  const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, hasSurvey: true }, surface: 'terminal' })
  expect(await ui.find({ type: 'Text' })).toBeUndefined()
  await ui.unmount()
})

test('a turn with no usage adds nothing', { options: { budget: 1_000_000 } }, async ($, on) => {
  engine(on, {})
  await $.session.start(START)
  await $.turn.complete(turn(1, usage(0, 200_000, 0, 0)))
  const { usage: _dropped, ...aborted } = { ...turn(2, usage(0, 0, 0, 0)), isAborted: true, reason: 'aborted' as const }
  await $.turn.complete(aborted)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find(LINE))?.text).toBe('Budget 200k / 1.0M (20%)')
  await ui.unmount()
})

for (const reason of ['clear', 'resume'] as const) {
  test(`session.end for ${reason} starts the count over`, { options: { budget: 1_000_000 } }, async ($, on) => {
    engine(on, {})
    await $.session.start(START)
    await $.turn.complete(turn(1, usage(0, 200_000, 0, 0)))
    await $.session.end(end(reason))
    const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
    expect((await ui.find(LINE))?.text).toBe('Budget 0 / 1.0M (0%)')
    await ui.unmount()
  })
}

test('session.end for prompt_input_exit or other keeps the count', { options: { budget: 1_000_000 } }, async ($, on) => {
  engine(on, {})
  await $.session.start(START)
  await $.turn.complete(turn(1, usage(0, 200_000, 0, 0)))
  await $.session.end(end('prompt_input_exit'))
  await $.session.end(end('other'))
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find(LINE))?.text).toBe('Budget 200k / 1.0M (20%)')
  await ui.unmount()
})

test('a reload (session.start again) keeps the spend', { options: { budget: 1_000_000 } }, async ($, on) => {
  engine(on, {})
  await $.session.start(START)
  await $.turn.complete(turn(1, usage(0, 300_000, 0, 0)))
  await $.session.start(START)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find(LINE))?.text).toBe('Budget 300k / 1.0M (30%)')
  await ui.unmount()
})

test('a compaction adds its tokens but not a turn', { options: { budget: 1_000_000 } }, async ($, on) => {
  engine(on, {}, usage(100_000, 20_000, 0, 30_000))
  // Watches the writes on their way to the kit's own state, which answers them.
  let written: Spend | undefined
  on('state.set', { plugin: 'token-budget', key: 'spent' }, (_, e, next) => {
    written = e.value as Spend
    return next(e)
  })
  await $.session.start(START)
  await $.turn.complete(turn(1, usage(0, 100_000, 0, 0)))
  const result = await $.session.compact({ trigger: 'manual', messages: MESSAGES })
  expect(result.skip).toBeUndefined()
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find(LINE))?.text).toBe('Budget 250k / 1.0M (25%)')
  await ui.unmount()
  expect(written?.turns).toBe(1)
  expect(written === undefined ? 0 : total(written)).toBe(250_000)
})

test('a skipped compaction adds nothing', { options: { budget: 1_000_000 } }, async ($, on) => {
  engine(on, {})
  await $.session.start(START)
  const result = await $.session.compact({ trigger: 'manual', messages: MESSAGES })
  expect(result.skip).toBe('test')
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find(LINE))?.text).toBe('Budget 0 / 1.0M (0%)')
  await ui.unmount()
})

test('a malformed variable is named in one toast, and nothing is drawn', async ($, on) => {
  const { toasts } = engine(on, { OMC_RUN_BUDGET_TOKENS: 'lots' })
  await $.session.start(START)
  await $.session.start(START)
  expect(toasts).toEqual([
    'token-budget: ignoring OMC_RUN_BUDGET_TOKENS="lots"; a budget is a token count of at least 1',
  ])
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text' })).toBeUndefined()
  await ui.unmount()
})

test('a readable budget raises no toast', async ($, on) => {
  const { toasts } = engine(on, { OMC_RUN_BUDGET_TOKENS: '1e6' })
  await $.session.start(START)
  expect(toasts).toEqual([])
})
