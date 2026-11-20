import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

import { DEFAULT_LABEL, listIssuesArgs, settings } from '../hooks/logic'

// The test runner provides it; the engine's types do not declare it.
declare function setTimeout(callback: (value?: unknown) => void, ms: number): unknown

const ANSWER = { content: [{ type: 'text', text: '{"issues":[]}' }], isError: false }

/**
 * Starts a session with the Linear connector stubbed, and returns the label of
 * each `list_issues` call the mod made.
 */
async function labelsQueried($: Engine, on: On): Promise<unknown[]> {
  const labels: unknown[] = []
  on('mcp.call', (_, e) => {
    if (e.tool === 'list_issues') {
      labels.push(e.args.label)
    }

    return { value: ANSWER }
  })
  on('command.register', () => ({ value: { command: 'inbox' } }))
  on('store.get', () => ({ value: undefined }))
  on('store.set', () => ({ value: undefined }))
  on('clock.now', () => ({ value: 1 }))
  on('clock.every', () => ({ value: undefined }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  // The mod's first read runs unawaited; let it finish before the test ends.
  await new Promise(resolve => setTimeout(resolve, 20))

  return labels
}

test('with no config, it queries the label owner-action', async ($, on) => {
  expect(new Set(await labelsQueried($, on))).toEqual(new Set(['owner-action']))
})

test(
  'with config {label: "needs-human"}, it queries needs-human',
  { options: { label: 'needs-human' } },
  async ($, on) => {
    expect(new Set(await labelsQueried($, on))).toEqual(new Set(['needs-human']))
  },
)

test('settings: a blank or missing label is the default', () => {
  expect(settings({}).label).toBe(DEFAULT_LABEL)
  expect(settings({ label: '  ' }).label).toBe(DEFAULT_LABEL)
  expect(settings({ label: 42 }).label).toBe(DEFAULT_LABEL)
  expect(settings({ label: ' needs-human ' }).label).toBe('needs-human')
})

test('the query carries the label and the page size', () => {
  expect(listIssuesArgs('needs-human')).toMatchObject({ label: 'needs-human', limit: 250 })
})
