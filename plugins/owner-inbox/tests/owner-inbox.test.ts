import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

import { DEFAULT_LABEL, filedAsk, listIssuesArgs, settings } from '../hooks/logic'

const ANSWER = { content: [{ type: 'text', text: '{"issues":[]}' }], isError: false }

type Call = { label: unknown; tool: string }

/**
 * Stubs the engine beneath the mod: the Linear connector records its calls, and
 * the clock and store are the kit's, so the mod's timer fires only when the
 * test advances the clock.
 */
function stubEngine(on: On, calls: Call[]) {
  on('mcp.call', (_, e) => {
    calls.push({ label: e.args.label, tool: e.tool })

    return { value: ANSWER }
  })
  on('command.register', () => ({ value: { command: 'inbox' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  mock.store(on)

  return mock.clock(on)
}

/** The label of each `list_issues` call a session start makes. */
async function labelsQueried($: Engine, on: On): Promise<unknown[]> {
  const calls: Call[] = []
  const clock = stubEngine(on, calls)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await clock.settle()

  return calls.filter(call => call.tool === 'list_issues').map(call => call.label)
}

test('with no config, it queries the label owner-action, once', async ($, on) => {
  expect(await labelsQueried($, on)).toEqual(['owner-action'])
})

test(
  'with config {label: "needs-human"}, it queries needs-human, once',
  { options: { label: 'needs-human' } },
  async ($, on) => {
    expect(await labelsQueried($, on)).toEqual(['needs-human'])
  },
)

test(
  'an agent filing an ask with the configured label raises a toast and a refresh',
  { options: { label: 'needs-human' } },
  async ($, on) => {
    const calls: Call[] = []
    const toasts: unknown[] = []
    const clock = stubEngine(on, calls)
    on('ui.toast', (_, e) => {
      toasts.push(e)

      return { value: undefined }
    })
    on('tool.call', () => ({ result: {} }))
    await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
    await clock.settle()
    const before = calls.length

    await $.tool.call({
      tool: 'mcp__claude_ai_Linear__save_issue',
      title: 'Approve the invoice',
      labels: ['Needs-Human'],
    })
    await clock.settle()
    expect(JSON.stringify(toasts)).toContain('Action for you: Approve the invoice')
    expect(calls.length).toBeGreaterThan(before)

    // The default label is not this project's ask label.
    toasts.length = 0
    await $.tool.call({
      tool: 'mcp__claude_ai_Linear__save_issue',
      title: 'Not an ask',
      labels: ['owner-action'],
    })
    await clock.settle()
    expect(toasts).toEqual([])
  },
)

test('the refresh timer queries once per period', async ($, on) => {
  const calls: Call[] = []
  const clock = stubEngine(on, calls)
  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await clock.settle()
  expect(calls).toHaveLength(1)

  await clock.advance(120_000)
  expect(calls).toHaveLength(2)
})

test('settings: a blank or missing label is the default', () => {
  expect(settings({}).label).toBe(DEFAULT_LABEL)
  expect(settings({ label: '  ' }).label).toBe(DEFAULT_LABEL)
  expect(settings({ label: 42 }).label).toBe(DEFAULT_LABEL)
  expect(settings({ label: ' needs-human ' }).label).toBe('needs-human')
})

test('the query carries the label and the page size', () => {
  expect(listIssuesArgs('needs-human')).toMatchObject({ label: 'needs-human', limit: 250 })
})

test('filedAsk detects an ask by the configured label, in any case', () => {
  const save = 'mcp__claude_ai_Linear__save_issue'
  const rows: [string, string, unknown, string | null][] = [
    ['needs-human', save, { title: 'A', labels: ['Needs-Human'] }, 'A'],
    ['needs-human', save, { title: 'A', addLabels: ['needs-human'] }, 'A'],
    ['needs-human', save, { title: 'A', labels: ['owner-action'] }, null],
    ['owner-action', save, { title: 'A', labels: ['owner-action'] }, 'A'],
    ['owner-action', save, { labels: ['owner-action'] }, 'A new ask'],
    ['needs-human', 'mcp__claude_ai_Linear__create_issue', { title: 'B', labels: ['needs-human'] }, 'B'],
    ['needs-human', 'mcp__claude_ai_Linear__list_issues', { labels: ['needs-human'] }, null],
    ['needs-human', save, { title: 'A' }, null],
    ['needs-human', save, undefined, null],
  ]
  for (const [label, tool, input, expected] of rows) {
    expect(filedAsk(label, tool, input)).toBe(expected)
  }
})
