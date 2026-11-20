import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

import {
  BLIND,
  headline,
  judge,
  label,
  names,
  onConnect,
  plan,
  shouldRemember,
  sightings,
} from '../hooks/health'
import type { Seen } from '../types'

const BAND = {
  plugin: 'mcp-health',
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

const BROKEN = 'plugin:oh-my-claudecode:t'
const FINE = 'plugin:easel:easel'
const HELD = 'plugin:browser:browser'
const LINEAR = 'claude.ai Linear'

const ENGINE = { plugin: 'engine' }
const TO_ENGINE = [{ plugin: 'other-mod' }, { plugin: 'engine' }]

// shouldRemember: the startup-path decision.

test('an engine request that reached the engine is remembered, unheld', () => {
  expect(shouldRemember(ENGINE, BROKEN, {}, TO_ENGINE)).toEqual({ server: BROKEN, isHeld: false })
})

test("a plugin's own request is not remembered", () => {
  expect(shouldRemember({ plugin: 'other-mod' }, BROKEN, {}, TO_ENGINE)).toBeNull()
})

test('a settings server is remembered, but checked only when watched', () => {
  const seen = shouldRemember(ENGINE, LINEAR, {}, TO_ENGINE)
  expect(seen).toEqual({ server: LINEAR, isHeld: false })
  expect(plan([seen as Seen], [], []).check).toEqual([])
  expect(plan([seen as Seen], [LINEAR], []).check).toEqual([LINEAR])
})

test('a deny from beneath is held', () => {
  expect(shouldRemember(ENGINE, HELD, { deny: 'held' }, TO_ENGINE)).toEqual({
    server: HELD,
    isHeld: true,
  })
})

test('a hook beneath that answered without next is held', () => {
  const trace = [{ plugin: 'holder-mod' }]
  expect(shouldRemember(ENGINE, HELD, { value: { isConnected: true } }, trace)).toEqual({
    server: HELD,
    isHeld: true,
  })
  expect(shouldRemember(ENGINE, HELD, {}, [])?.isHeld).toBe(true)
})

test("a connected or refused value does not decide held; the trace does", () => {
  const connected = { value: { isConnected: true, server: FINE } }
  const refused = { value: { isConnected: false, reason: 'failed', message: 'x' } }
  expect(shouldRemember(ENGINE, FINE, connected, TO_ENGINE)?.isHeld).toBe(false)
  expect(shouldRemember(ENGINE, BROKEN, refused, TO_ENGINE)?.isHeld).toBe(false)
})

// onConnect: returns exactly what next(e) resolved to, and notes it.

function fakeNext(result: object, trace: readonly { plugin: string }[]) {
  return Object.assign(async () => result, { origin: ENGINE, trace })
}

test('the hook returns the same object next(e) resolved to, and notes the server', async () => {
  const cases: [object, readonly { plugin: string }[], boolean][] = [
    [{ value: { isConnected: true, server: FINE } }, TO_ENGINE, false],
    [{ value: { isConnected: false, reason: 'failed', message: 'x' } }, TO_ENGINE, false],
    [{ deny: 'held' }, TO_ENGINE, true],
  ]
  for (const [result, trace, isHeld] of cases) {
    sightings.splice(0)
    const e = { server: BROKEN, provider: { plugin: 'oh-my-claudecode', tier: 'user' } }
    const returned = await onConnect({} as never, e as never, fakeNext(result, trace) as never)
    expect(returned === result).toBe(true)
    expect(sightings).toEqual([{ server: BROKEN, isHeld }])
  }
})

// names, plan, judge, label, headline.

test('names are trimmed once, empty ones dropped, each kept once', () => {
  expect(names([` ${BROKEN} `, BROKEN, '  ', LINEAR])).toEqual([BROKEN, LINEAR])
  expect(names('not a list')).toEqual([])
})

test('a padded watch name, once trimmed, is checked and judged as named', () => {
  const watch = names([`  ${LINEAR}  `])
  const seen: Seen[] = [{ server: LINEAR, isHeld: false }]
  expect(plan(seen, watch, []).check).toEqual([LINEAR])
  const auth = [{ server: LINEAR, answer: { isConnected: false, reason: 'auth' } as const }]
  const first = judge(auth, watch, {})
  expect(judge(auth, watch, first.strikes).down).toEqual([{ server: LINEAR, reason: 'auth' }])
})

test('only servers seen starting unheld are checked; watch adds, never replaces', () => {
  const seen: Seen[] = [
    { server: FINE, isHeld: false },
    { server: BROKEN, isHeld: false },
    { server: HELD, isHeld: true },
  ]
  expect(plan(seen, [], [])).toEqual({
    check: [BROKEN, FINE].sort(),
    unseen: [],
    isBlind: false,
  })
  expect(plan(seen, [LINEAR, HELD], [])).toEqual({
    check: [BROKEN, FINE].sort(),
    unseen: [HELD, LINEAR].sort(),
    isBlind: false,
  })
  expect(plan(seen, [LINEAR], [BROKEN, LINEAR])).toEqual({
    check: [FINE],
    unseen: [],
    isBlind: false,
  })
})

test('a failure counts as down only on the second in a row; a success resets it', () => {
  const failed = [{ server: BROKEN, answer: { isConnected: false, reason: 'failed' } as const }]
  const ok = [{ server: BROKEN, answer: { isConnected: true } as const }]
  const one = judge(failed, [], {})
  expect(one.down).toEqual([])
  const two = judge(failed, [], one.strikes)
  expect(two.down).toEqual([{ server: BROKEN, reason: 'failed' }])
  expect(judge(ok, [], two.strikes)).toEqual({ down: [], quiet: [], strikes: {} })
})

test('blind only when plugin servers started and every start looked held', () => {
  expect(plan([], [], []).isBlind).toBe(false)
  expect(plan([{ server: LINEAR, isHeld: true }], [], []).isBlind).toBe(false)
  expect(plan([{ server: HELD, isHeld: true }], [], []).isBlind).toBe(true)
  const mixed = [
    { server: HELD, isHeld: true },
    { server: FINE, isHeld: false },
  ]
  expect(plan(mixed, [], []).isBlind).toBe(false)
})

test('no answer in time is unknown: no strike, the count stands, listed as quiet', () => {
  const timeout = [{ server: BROKEN, answer: { isConnected: false, reason: 'timeout' } as const }]
  expect(judge(timeout, [], {})).toEqual({
    down: [],
    quiet: [{ server: BROKEN, reason: 'timeout' }],
    strikes: {},
  })
  expect(judge(timeout, [], { [BROKEN]: 1 }).strikes).toEqual({ [BROKEN]: 1 })
  expect(label({ server: BROKEN, reason: 'timeout' })).toBe('not answering')
})

test('auth and unlisted count only when named; a choice never counts', () => {
  const answers = (['auth', 'unlisted', 'disabled', 'policy'] as const).map(reason => ({
    server: reason,
    answer: { isConnected: false, reason } as const,
  }))
  const strikes = { auth: 1, unlisted: 1, disabled: 1, policy: 1 }
  expect(judge(answers, [], strikes).down).toEqual([])
  expect(judge(answers, ['auth', 'unlisted', 'disabled'], strikes).down.map(r => r.server)).toEqual(
    ['auth', 'unlisted'],
  )
})

test('labels and headline', () => {
  expect(label({ server: 'a', reason: 'failed' })).toBe('not connected')
  expect(label({ server: 'a', reason: 'auth' })).toBe('waiting for sign-in')
  expect(label({ server: 'a', reason: 'unseen' })).toBe('not seen this session')
  expect(headline([])).toBeNull()
  expect(headline([{ server: 'a', reason: 'failed' }])).toBe('MCP server not connected')
  expect(headline([{ server: 'a', reason: 'failed' }, { server: 'b', reason: 'auth' }])).toBe(
    '2 MCP servers not connected',
  )
})

// The mod in a session. The kit has no `$.mcp`, so the engine's startup
// requests cannot be raised here: the servers seen starting are seeded as the
// mod's own `started` state, and the test answers `$.mcp.connect`.

function session(on: On, started: Seen[], isUp: Map<string, boolean | 'hang'>) {
  const clock = mock.clock(on)
  const asked: string[] = []
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('state.get', { plugin: 'mcp-health', key: 'started' }, () => ({
    value: { value: started, version: 1 },
  }))
  on('mcp.connect', (_, e) => {
    asked.push(e.server)
    if (isUp.get(e.server) === 'hang') {
      return new Promise<never>(() => {})
    }

    return {
      value: isUp.get(e.server)
        ? { isConnected: true, server: e.server }
        : { isConnected: false, reason: 'failed', message: 'Connection closed' },
    }
  })

  return { clock, asked }
}

test('a broken server shows on the second failed check, and Check now clears it', async ($, on) => {
  const isUp = new Map([
    [BROKEN, false],
    [FINE, true],
  ])
  const started = [
    { server: BROKEN, isHeld: false },
    { server: FINE, isHeld: false },
  ]
  const { clock } = session(on, started, isUp)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  await clock.advance(15_000)
  let ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /not connected/ })).toBeUndefined()
  await ui.unmount()

  await clock.advance(45_000)
  for (const surface of ['terminal', 'desktop'] as const) {
    const shown = await $.ui.mount({ ...BAND, surface })
    expect((await shown.find({ type: 'Text', text: /^MCP server/ }))?.text).toBe(
      'MCP server not connected',
    )
    expect((await shown.find({ type: 'Text', text: /^plugin:/ }))?.text).toBe(
      `${BROKEN}: not connected`,
    )
    expect(await shown.find({ type: 'Text', text: /\/mcp to retry/ })).toBeDefined()
    await shown.unmount()
  }

  isUp.set(BROKEN, true)
  ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await ui.press({ key: 'check' })
  await ui.unmount()
  ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text' })).toBeUndefined()
  await ui.unmount()
})

test('with every server connected, nothing is drawn', async ($, on) => {
  const { clock } = session(on, [{ server: FINE, isHeld: false }], new Map([[FINE, true]]))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await clock.advance(135_000)

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text' })).toBeUndefined()
  await ui.unmount()
})

test('a held server and an unseen watched name are never asked', { options: { watch: [LINEAR] } }, async ($, on) => {
  const started = [
    { server: HELD, isHeld: true },
    { server: FINE, isHeld: false },
  ]
  const { clock, asked } = session(on, started, new Map([[FINE, true]]))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await clock.advance(135_000)

  expect(asked.length > 0).toBe(true)
  expect(asked.every(server => server === FINE)).toBe(true)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /claude\.ai/ }))?.text).toBe(
    `${LINEAR}: not seen this session`,
  )
  expect(await ui.find({ type: 'Text', text: /\/mcp to retry/ })).toBeUndefined()
  await ui.unmount()
})

test('an ignored server is never asked and never shown', { options: { ignore: [BROKEN] } }, async ($, on) => {
  const { clock, asked } = session(on, [{ server: BROKEN, isHeld: false }], new Map())
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await clock.advance(135_000)

  expect(asked).toEqual([])
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text' })).toBeUndefined()
  await ui.unmount()
})

test('a connect that never answers shows as not answering, and the next check still runs', async ($, on) => {
  const started = [
    { server: BROKEN, isHeld: false },
    { server: FINE, isHeld: false },
  ]
  const isUp = new Map<string, boolean | 'hang'>([
    [BROKEN, 'hang'],
    [FINE, true],
  ])
  const { clock, asked } = session(on, started, isUp)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

  await clock.advance(15_000)
  await clock.advance(10_000)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /^plugin:oh/ }))?.text).toBe(
    `${BROKEN}: not answering`,
  )
  expect(await ui.find({ type: 'Text', text: /not connected/ })).toBeUndefined()
  await ui.unmount()

  // The hung round ended, so the guard was released: the 60 s check asks again.
  const before = asked.filter(server => server === BROKEN).length
  await clock.advance(35_000)
  expect(asked.filter(server => server === BROKEN).length).toBe(before + 1)
})

test('when every plugin server start looked held, a dim row says the mod is blind', async ($, on) => {
  const { clock, asked } = session(on, [{ server: HELD, isHeld: true }], new Map())
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await clock.advance(15_000)

  expect(asked).toEqual([])
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /could not verify/ }))?.text).toBe(BLIND)
  await ui.unmount()
})

test('with no plugin servers started at all, nothing is drawn', async ($, on) => {
  const { clock } = session(on, [], new Map())
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await clock.advance(75_000)

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text' })).toBeUndefined()
  await ui.unmount()
})
