import type { ModelUsage, On, TurnUsage } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

import {
  add,
  bandText,
  chooseBudget,
  compact,
  level,
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

test('parseBudget reads a positive number the way OMC reads its variable', () => {
  expect(parseBudget('1000000')).toBe(1_000_000)
  expect(parseBudget('1e6')).toBe(1_000_000)
  expect(parseBudget(' 500000 ')).toBe(500_000)
  expect(parseBudget(250_000)).toBe(250_000)
  for (const unset of [undefined, null, '', '   ', '0', 0, -5, '-1', 'lots', NaN, Infinity, {}]) {
    expect(parseBudget(unset)).toBeNull()
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

test('compact writes counts as the band shows them', () => {
  expect(compact(0)).toBe('0')
  expect(compact(950)).toBe('950')
  expect(compact(1_000)).toBe('1k')
  expect(compact(412_000)).toBe('412k')
  expect(compact(999_499)).toBe('999k')
  expect(compact(999_500)).toBe('1.0M')
  expect(compact(1_000_000)).toBe('1.0M')
  expect(compact(12_480_000)).toBe('12.5M')
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
  if (logic.total(logic.add(ZERO, usage(5, 6, 70, 800))) !== 881) found.push('add')

  return found
}

test('mutation check: the real logic passes and every mutant is caught', () => {
  const real: Logic = { total, level, chooseBudget, add }
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
    'add ignores output': {
      ...real,
      add: (s, u) => ({ ...add(s, u), output: s.output }),
    },
  }
  for (const [name, mutant] of Object.entries(mutants)) {
    expect(failures(mutant).length > 0, `mutant survived: ${name}`).toBe(true)
  }
})

// The mod in a session. The test's own hooks stand for the engine: they answer
// session.start, turn.complete and session.end, and `mock.env` answers
// `$.env.get`.

function engine(on: On, env: Record<string, string>) {
  mock.env(on, env)
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.complete', () => ({ text: '' }))
  on('session.end', (_, e) => ({ sessionId: e.sessionId }))
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
    const text = await ui.find({ type: 'Text', text: /^Budget / })
    expect(text?.text).toBe('Budget 412k / 1.0M (41%)')
    expect(text?.props.color).toBeUndefined()
    await ui.unmount()
  }
})

test('the setting wins over the variable', { options: { budget: 500_000 } }, async ($, on) => {
  engine(on, { OMC_RUN_BUDGET_TOKENS: '1000000' })
  await $.session.start(START)
  await $.turn.complete(turn(1, usage(0, 100_000, 0, 0)))
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /^Budget / }))?.text).toBe('Budget 100k / 500k (20%)')
  await ui.unmount()
})

test('the band warns at 90% and alerts at 100%', { options: { budget: 1_000_000 } }, async ($, on) => {
  engine(on, {})
  await $.session.start(START)

  await $.turn.complete(turn(1, usage(0, 0, 900_000, 0)))
  let ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  let text = await ui.find({ type: 'Text', text: /^Budget / })
  expect(text?.text).toBe('Budget 900k / 1.0M (90%)')
  expect(text?.props.color).toBe('warning')
  await ui.unmount()

  await $.turn.complete(turn(2, usage(0, 100_000, 0, 0)))
  ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  text = await ui.find({ type: 'Text', text: /^Budget / })
  expect(text?.text).toBe('Budget 1.0M / 1.0M (100%)')
  expect(text?.props.color).toBe('error')
  await ui.unmount()
})

test('a turn with no usage adds nothing, and /clear starts the count over', { options: { budget: 1_000_000 } }, async ($, on) => {
  engine(on, {})
  await $.session.start(START)
  await $.turn.complete(turn(1, usage(0, 200_000, 0, 0)))
  const { usage: _dropped, ...aborted } = { ...turn(2, usage(0, 0, 0, 0)), isAborted: true, reason: 'aborted' as const }
  await $.turn.complete(aborted)

  let ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /^Budget / }))?.text).toBe('Budget 200k / 1.0M (20%)')
  await ui.unmount()

  await $.session.end({ reason: 'clear', sessionId: 's1', resume: { id: 's1' } })
  ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /^Budget / }))?.text).toBe('Budget 0 / 1.0M (0%)')
  await ui.unmount()
})

test('a restarted module keeps the spend', { options: { budget: 1_000_000 } }, async ($, on) => {
  engine(on, {})
  on('state.get', { plugin: 'token-budget', key: 'spent' }, () => ({
    value: { value: { input: 0, output: 300_000, cacheRead: 0, cacheWrite: 0, turns: 3 }, version: 1 },
  }))
  await $.session.start(START)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /^Budget / }))?.text).toBe('Budget 300k / 1.0M (30%)')
  await ui.unmount()
})
