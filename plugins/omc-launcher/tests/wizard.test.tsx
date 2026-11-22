import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { NONE, PANE } from '../hooks/register'
import { HINTS_5_8_6, skillMd } from './fixtures'

// A synthetic machine: HOME, an OMC install, project and user OMC config, and
// the session's command list. Nothing here reads the owner's real files.
const HOME = '/home/tester'
const CWD = '/work/project'
const PLUGINS = `${HOME}/.claude/plugins`
const OMC = `${PLUGINS}/cache/omc/oh-my-claudecode/5.8.6`
const SKILLS = ['verify', 'ralplan', 'team', 'ralph', 'autopilot']

type Tree = {
  files: Record<string, string>
  dirs: Record<string, { name: string; kind: 'file' | 'dir' }[]>
  /** The session's slash commands, as `$.command.list` names them. */
  commands: string[]
  /** What `$.session.cwd()` answers. */
  cwd: string
}

function machine(options: { installed?: boolean; active?: boolean; cacheOnly?: boolean } = {}): Tree {
  const { installed = true, active = installed, cacheOnly = false } = options
  const files: Record<string, string> = {}
  const dirs: Tree['dirs'] = {}
  // OMC's skills, one with no SKILL.md, and one of its commands/*.md, which is no
  // skill. skills/plan is listed by its frontmatter name, omc-plan, as OMC 5.8.6's is.
  const omc = [...SKILLS, 'omc-plan', 'no-skill-md', 'psm'].map(name => `oh-my-claudecode:${name}`)
  const commands = ['compact', 'other-plugin:ralph', ...(active ? omc : [])]
  if (!installed) {
    return { files, dirs, commands, cwd: CWD }
  }
  if (!cacheOnly) {
    files[`${PLUGINS}/installed_plugins.json`] = JSON.stringify({
      version: 2,
      plugins: { 'oh-my-claudecode@omc': [{ scope: 'user', installPath: OMC, version: '5.8.6' }] },
    })
  }
  // A stray file named like a newer version must not be taken for an install.
  dirs[`${PLUGINS}/cache/omc/oh-my-claudecode`] = [
    { name: '5.5.0', kind: 'dir' },
    { name: '5.8.6', kind: 'dir' },
    { name: '9.9.9', kind: 'file' },
  ]
  dirs[`${OMC}/skills`] = [
    ...[...SKILLS, 'plan', 'no-skill-md', 'unlisted'].map(name => ({ name, kind: 'dir' as const })),
    { name: 'README.md', kind: 'file' },
  ]
  for (const name of SKILLS) {
    files[`${OMC}/skills/${name}/SKILL.md`] = skillMd(name, HINTS_5_8_6[name] ?? null)
  }
  files[`${OMC}/skills/plan/SKILL.md`] = skillMd('omc-plan', HINTS_5_8_6.plan ?? null)
  // The reverse: listed by its folder name while its frontmatter names another.
  files[`${OMC}/skills/verify/SKILL.md`] = skillMd('omc-verify', null)
  // On disk, but not a command in this session: not runnable, so not listed.
  files[`${OMC}/skills/unlisted/SKILL.md`] = skillMd('unlisted', null)
  files[`${CWD}/.claude/omc.jsonc`] = `{
    // project profiles
    "autopilot": { "workflows": { "plan-build-qa": { "version": 1, "stages": ["ralplan", "execution", "qa"] }, } }
  }`
  files[`${HOME}/.config/claude-omc/config.jsonc`] = `{ /* user */ "autopilot": { "workflows": { "user-flow": { "version": 1, "stages": ["ralplan", "execution"] } } } }`

  return { files, dirs, commands, cwd: CWD }
}

type World = { submitted: string[]; registered: string[]; opened: string[]; closed: string[]; writes: string[]; toasts: string[] }

/** Stubs the engine beneath the mod over a synthetic machine, and records what the mod asks for. */
function stub(on: On, tree: Tree, env: Record<string, string> = { HOME }, refuseRun = false): World {
  const world: World = { submitted: [], registered: [], opened: [], closed: [], writes: [], toasts: [] }
  on('ui.toast', (_, e) => {
    world.toasts.push(String(e.text))

    return { value: undefined }
  })
  mock.env(on, env)
  on('fs.read', (_, e) => {
    const text = tree.files[e.path]

    return text === undefined ? { deny: `ENOENT: ${e.path}` } : { value: text }
  })
  on('fs.list', (_, e) => {
    const entries = tree.dirs[e.path]

    return entries === undefined
      ? { deny: `ENOENT: ${e.path}` }
      : { value: entries.map(entry => ({ ...entry, size: 0, mtimeMs: 0, isLink: false })) }
  })
  on('fs.exists', (_, e) => ({
    value: e.path in tree.files || e.path in tree.dirs || Object.keys(tree.files).some(path => path.startsWith(`${e.path}/`)),
  }))
  on('fs.write', (_, e) => {
    world.writes.push(e.path)

    return { value: undefined }
  })
  on('command.list', () => ({
    value: tree.commands.map(name => ({ name, description: `${name} command`, source: 'plugin' as const })),
  }))
  on('session.cwd', () => ({ value: tree.cwd }))
  on('command.register', (_, e) => {
    world.registered.push(e.name)

    return { value: { command: e.name } }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('ui.open', (_, e) => {
    world.opened.push(e.id)

    return { value: { isPlaced: true } }
  })
  on('ui.close', (_, e) => {
    world.closed.push(e.id)

    return { value: undefined }
  })
  // Beneath the mod: the OMC skill command it runs. /omc itself is answered by the mod.
  on('command.run', (_, e) => {
    if (refuseRun) {
      throw new Error('unknown command')
    }
    world.submitted.push(`/${e.command}${e.args === '' ? '' : ` ${e.args}`}`)

    return { text: '' }
  })
  on('prompt.submit', (_, e) => {
    world.submitted.push(`prompt: ${e.text}`)

    return { text: e.text }
  })

  return world
}

const PANE_PROPS = {
  plugin: 'omc-launcher',
  component: 'Pane',
  requestId: PANE,
  props: {
    title: 'OMC launcher',
    isFocused: true,
    bodyColumns: 80,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
} as const

async function start($: Engine, on: On, tree = machine(), env: Record<string, string> = { HOME }): Promise<World> {
  const world = stub(on, tree, env)
  await $.session.start({ cwd: CWD, surface: 'terminal', isInteractive: true })

  return world
}

async function openWizard($: Engine): Promise<string | undefined> {
  // The person typing /omc in the prompt box.
  const ran = await $.command.run({
    command: 'omc',
    args: '',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: true, columns: 160 },
  })

  return ran.text
}

const COMMAND_LINE = { type: 'Text', text: /^\/oh-my-claudecode:/ } as const

for (const surface of ['terminal', 'desktop'] as const) {
  test(`ralph: --critic=codex and a task run the exact command, on ${surface}`, async ($, on) => {
    const world = await start($, on)
    expect(world.registered).toEqual(['omc'])
    expect(await openWizard($)).toBe('OMC launcher opened: 6 skills.')
    expect(world.opened).toEqual([PANE])

    const ui = await $.ui.mount({ ...PANE_PROPS, surface })
    expect((await ui.find({ type: 'Text', text: /Step 1 of 3/ }))?.text).toBe('Step 1 of 3: pick a workflow')
    await ui.select({ key: 'skill', value: 'ralph' })
    expect((await ui.find({ type: 'Text', text: /Step 2 of 3/ }))?.text).toBe('Step 2 of 3: ralph options')
    await ui.select({ key: 'f1', value: '--critic=codex' })
    expect((await ui.find({ key: 'f1' }))?.props.value).toBe('--critic=codex')
    await ui.input({ key: 'f2', text: 'fix the flaky login test', kind: 'change' })
    await ui.press({ key: 'next' })
    expect((await ui.find(COMMAND_LINE))?.text).toBe('/oh-my-claudecode:ralph --critic=codex "fix the flaky login test"')
    expect((await ui.find({ key: 'run' }))?.props.label).toBe('Run')
    await ui.press({ key: 'run' })
    expect(world.submitted).toEqual(['/oh-my-claudecode:ralph --critic=codex "fix the flaky login test"'])
    expect(world.closed).toEqual([PANE])
    expect(world.writes).toEqual([])
    await ui.unmount()
  })
}

test('the picker lists the main workflows first, then the rest; only runnable skills with a SKILL.md', async ($, on) => {
  await start($, on)
  await openWizard($)
  const ui = await $.ui.mount({ ...PANE_PROPS, surface: 'terminal' })
  const drawn = JSON.stringify(await ui.drawn())
  const order = ['autopilot', 'ralph', 'team', 'ralplan', 'verify'].map(name => drawn.indexOf(`"value":"${name}"`))
  expect(order.every(at => at >= 0)).toBe(true)
  expect([...order].sort((a, b) => a - b)).toEqual(order)
  expect(drawn).not.toContain('no-skill-md')
  expect(drawn).not.toContain('"value":"psm"')
  await ui.unmount()
})

test('a skill the session cannot run is not listed, though its SKILL.md is on disk', async ($, on) => {
  const tree = machine()
  tree.commands = tree.commands.filter(name => name !== 'oh-my-claudecode:verify')
  await start($, on, tree)
  expect(await openWizard($)).toBe('OMC launcher opened: 5 skills.')
})

test('on a narrow pane every skill name shows whole; only the description is cut', async ($, on) => {
  await start($, on)
  await openWizard($)
  const ui = await $.ui.mount({ ...PANE_PROPS, props: { ...PANE_PROPS.props, bodyColumns: 24 }, surface: 'terminal' })
  const options = (await ui.find({ key: 'skill' }))?.props.options as { value: string; label: string }[]
  expect(options.map(option => option.label.startsWith(option.value))).toEqual(options.map(() => true))
  await ui.unmount()
})

test('ralplan: toggles in hint order, then the task', async ($, on) => {
  const world = await start($, on)
  await openWizard($)
  const ui = await $.ui.mount({ ...PANE_PROPS, surface: 'terminal' })
  await ui.select({ key: 'skill', value: 'ralplan' })
  await ui.press({ key: 'f3' })
  await ui.press({ key: 'f1' })
  await ui.press({ key: 'f0' })
  await ui.press({ key: 'f0' })
  expect((await ui.find({ type: 'Button', key: 'f1' }))?.text).toBe('[x] --deliberate')
  await ui.input({ key: 'f4', text: 'migrate the billing tables' })
  await ui.press({ key: 'next' })
  await ui.press({ key: 'run' })
  expect(world.submitted).toEqual(['/oh-my-claudecode:ralplan --deliberate --critic codex "migrate the billing tables"'])
  await ui.unmount()
})

test('team: the N:agent-type pair and the ralph keyword; a task naming the keyword stays the task', async ($, on) => {
  const world = await start($, on)
  await openWizard($)
  const ui = await $.ui.mount({ ...PANE_PROPS, surface: 'terminal' })
  await ui.select({ key: 'skill', value: 'team' })
  await ui.input({ key: 'f0-left', text: '3', kind: 'change' })
  await ui.input({ key: 'f0-right', text: 'executor', kind: 'change' })
  await ui.input({ key: 'f2', text: 'ralph the logs' })
  await ui.press({ key: 'next' })
  await ui.press({ key: 'run' })
  expect(world.submitted).toEqual(['/oh-my-claudecode:team 3:executor "ralph the logs"'])
  await ui.unmount()
})

test('autopilot: --workflow offers the project then the user profiles from JSONC config', async ($, on) => {
  const world = await start($, on)
  await openWizard($)
  const ui = await $.ui.mount({ ...PANE_PROPS, surface: 'terminal' })
  await ui.select({ key: 'skill', value: 'autopilot' })
  const pick = JSON.stringify(await ui.drawn())
  expect(pick).toContain(`"value":"${NONE}"`)
  expect(pick.indexOf('"value":"plan-build-qa"')).toBeGreaterThan(-1)
  expect(pick.indexOf('"value":"user-flow"')).toBeGreaterThan(pick.indexOf('"value":"plan-build-qa"'))
  await ui.select({ key: 'f0-pick', value: 'user-flow' })
  await ui.select({ key: 'f0-pick', value: NONE })
  await ui.input({ key: 'f1', text: 'x' })
  await ui.press({ key: 'next' })
  expect((await ui.find(COMMAND_LINE))?.text).toBe('/oh-my-claudecode:autopilot x')
  await ui.press({ key: 'back' })
  await ui.select({ key: 'f0-pick', value: 'plan-build-qa' })
  await ui.input({ key: 'f1', text: 'a CLI that tidies dotfiles' })
  await ui.press({ key: 'next' })
  await ui.press({ key: 'run' })
  expect(world.submitted).toEqual(['/oh-my-claudecode:autopilot --workflow plan-build-qa "a CLI that tidies dotfiles"'])
  await ui.unmount()
})

test('autopilot: with an empty task, Run anyway must be pressed twice', async ($, on) => {
  const world = await start($, on)
  await openWizard($)
  const ui = await $.ui.mount({ ...PANE_PROPS, surface: 'terminal' })
  await ui.select({ key: 'skill', value: 'autopilot' })
  await ui.press({ key: 'next' })
  expect((await ui.find(COMMAND_LINE))?.text).toBe('/oh-my-claudecode:autopilot')
  expect((await ui.find({ type: 'Text', text: /is required/ }))?.text).toBe('product idea or task description is required')
  expect((await ui.find({ key: 'run' }))?.props.label).toBe('Run anyway')
  await ui.press({ key: 'run' })
  expect(world.submitted).toEqual([])
  expect(world.closed).toEqual([])
  expect((await ui.find({ type: 'Text', text: /again/ }))?.text).toBe('Press Run anyway again to run it as shown.')
  // Leaving the review step disarms it.
  await ui.press({ key: 'back' })
  await ui.press({ key: 'next' })
  await ui.press({ key: 'run' })
  expect(world.submitted).toEqual([])
  await ui.press({ key: 'run' })
  expect(world.submitted).toEqual(['/oh-my-claudecode:autopilot'])
  await ui.unmount()
})

test('autopilot: a typed workflow name and no config work too', async ($, on) => {
  const tree = machine()
  delete tree.files[`${CWD}/.claude/omc.jsonc`]
  delete tree.files[`${HOME}/.config/claude-omc/config.jsonc`]
  const world = await start($, on, tree)
  await openWizard($)
  const ui = await $.ui.mount({ ...PANE_PROPS, surface: 'terminal' })
  await ui.select({ key: 'skill', value: 'autopilot' })
  expect(await ui.find({ key: 'f0-pick' })).toBeUndefined()
  await ui.input({ key: 'f0', text: 'custom', kind: 'change' })
  await ui.input({ key: 'f1', text: 'build it' })
  await ui.press({ key: 'next' })
  await ui.press({ key: 'run' })
  expect(world.submitted).toEqual(['/oh-my-claudecode:autopilot --workflow custom "build it"'])
  await ui.unmount()
})

test('the user config is read from XDG_CONFIG_HOME when it is set', async ($, on) => {
  const tree = machine()
  delete tree.files[`${CWD}/.claude/omc.jsonc`]
  tree.files['/xdg/claude-omc/config.jsonc'] = '{"autopilot": {"workflows": {"xdg-flow": {}}}}'
  await start($, on, tree, { HOME, XDG_CONFIG_HOME: '/xdg' })
  await openWizard($)
  const ui = await $.ui.mount({ ...PANE_PROPS, surface: 'terminal' })
  await ui.select({ key: 'skill', value: 'autopilot' })
  const values = ((await ui.find({ key: 'f0-pick' }))?.props.options as { value: string }[]).map(option => option.value)
  expect(values).toEqual([NONE, 'xdg-flow'])
  await ui.unmount()
})

test('the project config is read from the cwd when /omc runs, not when the session started', async ($, on) => {
  const tree = machine()
  await start($, on, tree)
  tree.cwd = '/other/repo'
  tree.files['/other/repo/.claude/omc.jsonc'] = '{"autopilot": {"workflows": {"other-flow": {}}}}'
  await openWizard($)
  const ui = await $.ui.mount({ ...PANE_PROPS, surface: 'terminal' })
  await ui.select({ key: 'skill', value: 'autopilot' })
  const values = ((await ui.find({ key: 'f0-pick' }))?.props.options as { value: string }[]).map(option => option.value)
  expect(values).toEqual([NONE, 'other-flow', 'user-flow'])
  await ui.unmount()
})

test('Back returns a step with the values kept; Cancel closes, resets and runs nothing', async ($, on) => {
  const world = await start($, on)
  await openWizard($)
  const ui = await $.ui.mount({ ...PANE_PROPS, surface: 'terminal' })
  await ui.select({ key: 'skill', value: 'ralph' })
  await ui.press({ key: 'f0' })
  await ui.press({ key: 'next' })
  expect((await ui.find(COMMAND_LINE))?.text).toBe('/oh-my-claudecode:ralph --no-deslop')
  expect((await ui.find({ type: 'Text', text: /required/ }))?.text).toBe('task description is required')
  await ui.press({ key: 'back' })
  expect((await ui.find({ type: 'Button', key: 'f0' }))?.text).toBe('[x] --no-deslop')
  await ui.press({ key: 'back' })
  expect((await ui.find({ type: 'Text', text: /Step 1 of 3/ }))?.text).toBe('Step 1 of 3: pick a workflow')
  // Back to the picker starts the next skill's form empty.
  await ui.select({ key: 'skill', value: 'ralph' })
  expect((await ui.find({ type: 'Button', key: 'f0' }))?.text).toBe('[ ] --no-deslop')
  await ui.press({ key: 'cancel' })
  expect(world.closed).toEqual([PANE])
  expect(world.submitted).toEqual([])
  // Drawn again, the pane is back at the first step.
  expect((await ui.find({ type: 'Text', text: /Step 1 of 3/ }))?.text).toBe('Step 1 of 3: pick a workflow')
  await ui.unmount()
})

test('running /omc again starts the wizard over', async ($, on) => {
  await start($, on)
  await openWizard($)
  const ui = await $.ui.mount({ ...PANE_PROPS, surface: 'terminal' })
  await ui.select({ key: 'skill', value: 'ralph' })
  expect((await ui.find({ type: 'Text', text: /Step 2 of 3/ }))?.text).toBe('Step 2 of 3: ralph options')
  await openWizard($)
  expect((await ui.find({ type: 'Text', text: /Step 1 of 3/ }))?.text).toBe('Step 1 of 3: pick a workflow')
  await ui.unmount()
})

test('a skill with no hint gets one free-text arguments field, passed as typed', async ($, on) => {
  const world = await start($, on)
  await openWizard($)
  const ui = await $.ui.mount({ ...PANE_PROPS, surface: 'terminal' })
  await ui.select({ key: 'skill', value: 'verify' })
  await ui.input({ key: 'args', text: 'the login flow --strict' })
  await ui.press({ key: 'next' })
  await ui.press({ key: 'run' })
  expect(world.submitted).toEqual(['/oh-my-claudecode:verify the login flow --strict'])
  await ui.unmount()
})

test('without installed_plugins.json, the highest cached version is used', async ($, on) => {
  const world = await start($, on, machine({ cacheOnly: true }))
  expect(world.registered).toEqual(['omc'])
  expect(await openWizard($)).toBe('OMC launcher opened: 6 skills.')
})

test('an installed_plugins.json entry whose folder is gone falls back to the cache', async ($, on) => {
  const tree = machine()
  tree.files[`${PLUGINS}/installed_plugins.json`] = JSON.stringify({
    plugins: { 'oh-my-claudecode@omc': [{ scope: 'user', installPath: '/gone/9.9.9', version: '9.9.9' }] },
  })
  await start($, on, tree)
  expect(await openWizard($)).toBe('OMC launcher opened: 6 skills.')
})

test('a command that cannot run says so in a toast', async ($, on) => {
  const world = stub(on, machine(), { HOME }, true)
  await $.session.start({ cwd: CWD, surface: 'terminal', isInteractive: true })
  await openWizard($)
  const ui = await $.ui.mount({ ...PANE_PROPS, surface: 'terminal' })
  await ui.select({ key: 'skill', value: 'verify' })
  await ui.press({ key: 'next' })
  await ui.press({ key: 'run' })
  expect(world.submitted).toEqual([])
  expect(world.toasts).toHaveLength(1)
  expect(world.toasts[0]).toContain('Could not run /oh-my-claudecode:verify')
  await ui.unmount()
})

test('without OMC, /omc is not registered, and running it anyway says so', async ($, on) => {
  const world = await start($, on, machine({ installed: false }))
  expect(world.registered).toEqual([])
  expect(await openWizard($)).toBe('oh-my-claudecode is not active in this session, so there is nothing to launch.')
  expect(world.opened).toEqual([])
})

test('OMC on disk but not active in this session: /omc is not registered', async ($, on) => {
  const world = await start($, on, machine({ active: false }))
  expect(world.registered).toEqual([])
})

test('CLAUDE_CONFIG_DIR is where installed_plugins.json is read', async ($, on) => {
  const tree = machine()
  const json = tree.files[`${PLUGINS}/installed_plugins.json`] ?? ''
  delete tree.files[`${PLUGINS}/installed_plugins.json`]
  delete tree.dirs[`${PLUGINS}/cache/omc/oh-my-claudecode`]
  tree.files['/cfg/plugins/installed_plugins.json'] = json
  await start($, on, tree, { HOME, CLAUDE_CONFIG_DIR: '/cfg' })
  expect(await openWizard($)).toBe('OMC launcher opened: 6 skills.')
})

test('plan, listed by its frontmatter name omc-plan, is offered and run by its folder name', async ($, on) => {
  const world = await start($, on)
  await openWizard($)
  const ui = await $.ui.mount({ ...PANE_PROPS, surface: 'terminal' })
  const values = ((await ui.find({ key: 'skill' }))?.props.options as { value: string }[]).map(option => option.value)
  expect(values).toContain('plan')
  expect(values).not.toContain('omc-plan')
  expect(values).not.toContain('unlisted')
  await ui.select({ key: 'skill', value: 'plan' })
  await ui.select({ key: 'f0', value: '--consensus' })
  await ui.input({ key: 'f3', text: 'split the monolith' })
  await ui.press({ key: 'next' })
  await ui.press({ key: 'run' })
  expect(world.submitted).toEqual(['/oh-my-claudecode:plan --consensus "split the monolith"'])
  await ui.unmount()
})

test('two presses on a toggle before it is drawn again turn it on and back off', async ($, on) => {
  await start($, on)
  await openWizard($)
  const ui = await $.ui.mount({ ...PANE_PROPS, surface: 'terminal' })
  await ui.select({ key: 'skill', value: 'ralph' })
  await Promise.all([ui.press({ key: 'f0' }), ui.press({ key: 'f0' })])
  expect((await ui.find({ type: 'Button', key: 'f0' }))?.text).toBe('[ ] --no-deslop')
  await ui.unmount()
})
