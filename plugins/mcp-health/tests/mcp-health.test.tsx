import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

import { headline, unhealthy, watched } from '../hooks/health'

const BAND = {
  plugin: 'mcp-health',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isCollapsed: false,
    isWorking: false,
    maxRows: 4,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 4 },
    view: {},
  },
} as const

const BROKEN = 'plugin:oh-my-claudecode:t'
const FINE = 'plugin:easel:easel'

test('the watch list replaces the seen servers, and the ignore list wins', () => {
  expect(watched([FINE, BROKEN, FINE], [], [])).toEqual([FINE, BROKEN].sort())
  expect(watched([FINE], ['claude.ai Linear'], [])).toEqual(['claude.ai Linear'])
  expect(watched([FINE, BROKEN], [], [BROKEN])).toEqual([FINE])
  expect(watched([], [], [])).toEqual([])
})

test('failed and sign-in are down; a choice is not; unlisted only when named', () => {
  const answers = [
    { server: 'a', answer: { isConnected: true } as const },
    { server: 'b', answer: { isConnected: false, reason: 'failed' } as const },
    { server: 'c', answer: { isConnected: false, reason: 'auth' } as const },
    { server: 'd', answer: { isConnected: false, reason: 'disabled' } as const },
    { server: 'e', answer: { isConnected: false, reason: 'unlisted' } as const },
    { server: 'f', answer: { isConnected: false, reason: 'unlisted' } as const },
  ]

  expect(unhealthy(answers, ['f']).map(down => down.server)).toEqual(['b', 'c', 'f'])
})

test('the headline names each server, and is null when none is down', () => {
  expect(headline([])).toBeNull()
  expect(headline([{ server: BROKEN, reason: 'failed' }])).toBe(
    `MCP server not connected: ${BROKEN}`,
  )
  expect(headline([{ server: 'a', reason: 'failed' }, { server: 'b', reason: 'auth' }])).toBe(
    '2 MCP servers not connected: a, b (auth)',
  )
})

/** Starts a session with these servers, answering `$.mcp.connect` from `isUp`. */
function servers(on: On, isUp: Map<string, boolean>) {
  const clock = mock.clock(on)
  mock.store(on)
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('mcp.connect', (_, e) => ({
    value: isUp.get(e.server)
      ? { isConnected: true, server: e.server }
      : { isConnected: false, reason: 'failed', message: 'Connection closed' },
  }))

  return clock
}

test(
  'a broken watched server raises the band within one check, and a fix clears it',
  { options: { watch: [BROKEN, FINE] } },
  async ($, on) => {
    const isUp = new Map([
      [BROKEN, false],
      [FINE, true],
    ])
    const clock = servers(on, isUp)
    await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

    for (const surface of ['terminal', 'desktop'] as const) {
      const ui = await $.ui.mount({ ...BAND, surface })
      expect(await ui.find({ type: 'Text', text: /not connected/ })).toBeUndefined()
      await ui.unmount()
    }

    await clock.advance(15_000)
    for (const surface of ['terminal', 'desktop'] as const) {
      const ui = await $.ui.mount({ ...BAND, surface })
      expect((await ui.find({ type: 'Text', text: /not connected/ }))?.text).toBe(
        `MCP server not connected: ${BROKEN}`,
      )
      expect(await ui.find({ type: 'Text', text: /\/mcp to retry/ })).toBeDefined()
      await ui.unmount()
    }

    // The person reconnects with /mcp, then presses Check now.
    isUp.set(BROKEN, true)
    const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
    await ui.press({ key: 'check' })
    await ui.unmount()
    const after = await $.ui.mount({ ...BAND, surface: 'terminal' })
    expect(await after.find({ type: 'Text', text: /not connected/ })).toBeUndefined()
    await after.unmount()
  },
)

test(
  'with every watched server connected, nothing is drawn',
  { options: { watch: [FINE] } },
  async ($, on) => {
    const clock = servers(on, new Map([[FINE, true]]))
    await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
    await clock.advance(75_000)

    const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
    expect(await ui.find({ type: 'Text' })).toBeUndefined()
    await ui.unmount()
  },
)

test(
  'an ignored server never raises the band',
  { options: { watch: [BROKEN], ignore: [BROKEN] } },
  async ($, on) => {
    const clock = servers(on, new Map([[BROKEN, false]]))
    await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
    await clock.advance(75_000)

    const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
    expect(await ui.find({ type: 'Text', text: /not connected/ })).toBeUndefined()
    await ui.unmount()
  },
)

test('a server remembered from an earlier session is checked', async ($, on) => {
  const clock = mock.clock(on)
  mock.store(on, { seen: [BROKEN] })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('mcp.connect', () => ({
    value: { isConnected: false, reason: 'failed', message: 'Connection closed' },
  }))
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await clock.advance(15_000)

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /not connected/ }))?.text).toBe(
    `MCP server not connected: ${BROKEN}`,
  )
  await ui.unmount()
})
