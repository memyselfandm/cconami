import { describe, expect, test } from 'claude-code/testing'

import type { Field } from '../types'
import {
  buildCommand,
  compareVersions,
  configChoices,
  formFor,
  frontmatter,
  highestVersion,
  installPathFrom,
  MAIN_WORKFLOWS,
  orderSkills,
  parseHint,
  parseJsonc,
  quoteText,
  seedValues,
  skillFrom,
  stripJsonc,
  tokenize,
  warnings,
} from '../hooks/logic'
import { HINTS_5_8_6, skillMd } from './fixtures'

/** A field as one short string, so a whole form compares in one line. */
function shape(field: Field): string {
  switch (field.kind) {
    case 'toggle':
      return `toggle(${field.emit})`
    case 'choice':
      return `choice(${field.options.map(o => o.emit).join('|')}${field.required ? ', required' : ''})`
    case 'value':
      return `value(${field.flag}${field.joiner}<${field.placeholder}>${field.required ? ', required' : ''})`
    case 'pair':
      return `pair(${field.left}:${field.right})`
    case 'text':
      return `text(${field.label}${field.required ? ', required' : ''})`
  }
}

/** The form a fixture SKILL.md yields, read through the frontmatter parser as the mod reads it. */
function formOf(name: string): string[] {
  const hint = HINTS_5_8_6[name]
  if (hint === undefined) {
    throw new Error(`no fixture for ${name}`)
  }
  const skill = skillFrom(name, skillMd(name, hint))
  if (skill === null) {
    throw new Error(`fixture ${name} has no frontmatter`)
  }
  const { fields, isFallback } = formFor(skill)
  if (isFallback) {
    return ['FALLBACK']
  }

  return fields.map(shape)
}

const EXPECTED: Record<string, string[]> = {
  'architecture-survey': ['text(optional directory or area to survey)'],
  'ask-navigator': ['text(loose idea | residual questions | map link or number | nothing to continue the open map, required)'],
  autopilot: ['value(--workflow <name>)', 'text(product idea or task description, required)'],
  cancel: ['toggle(--force)', 'toggle(--all)'],
  'deep-interview': ['toggle(--frontier)', 'toggle(--autoresearch)', 'text(idea or vague description, required)'],
  drydock: ['toggle(--check)'],
  'external-context': ['text(search query or topic, required)'],
  graph: ['text(descriptor.json | describe the pipeline, required)', 'value(--runs-root <dir>)'],
  harbor: ["text(sweep | look at #N | sign ... | what's ready?)"],
  hud: ['choice(setup|minimal|focused|full|status)'],
  intent: ['text(pasted feedback / chat log | path to existing intent.md | nothing to continue open review, required)'],
  launch: ['text(mission brief | path to existing spec, required)', 'toggle(--serial)'],
  map: ['text(what are you trying to do)'],
  plan: ['choice(--direct|--consensus|--review)', 'toggle(--interactive)', 'toggle(--deliberate)', 'text(task description, required)'],
  ralph: ['toggle(--no-deslop)', 'choice(--critic=architect|--critic=critic|--critic=codex)', 'text(task description, required)'],
  ralplan: ['toggle(--interactive)', 'toggle(--deliberate)', 'toggle(--architect codex)', 'toggle(--critic codex)', 'text(task description, required)'],
  'session-flow': ['choice(short|reset)'],
  skill: ['text(command, required)', 'text(args)'],
  team: ['pair(N:agent-type)', 'toggle(ralph)', 'text(task description, required)'],
  trace: ['text(observation to trace, required)'],
  ultragoal: ['text(brief or subcommand, required)'],
}

describe('every argument-hint in OMC 5.8.6', () => {
  test('the expectations cover every fixture, and no fixture falls back', () => {
    expect(Object.keys(EXPECTED).sort()).toEqual(Object.keys(HINTS_5_8_6).sort())
  })

  for (const name of Object.keys(HINTS_5_8_6)) {
    test(`${name} parses to its form`, () => {
      expect(formOf(name)).toEqual(EXPECTED[name])
    })
  }
})

describe('the commands the main workflows submit', () => {
  function form(name: string): Field[] {
    const skill = skillFrom(name, skillMd(name, HINTS_5_8_6[name] ?? null))
    if (skill === null) {
      throw new Error('no skill')
    }

    return formFor(skill).fields
  }

  test('ralph with --critic=codex and a task', () => {
    expect(buildCommand('ralph', form('ralph'), { f1: '--critic=codex', f2: 'fix the flaky test' })).toBe(
      '/oh-my-claudecode:ralph --critic=codex "fix the flaky test"',
    )
  })

  test('the task is quoted, double quotes and backslashes escaped, outer whitespace trimmed', () => {
    expect(
      buildCommand('ralplan', form('ralplan'), { f0: 'on', f1: 'on', f2: 'on', f4: '  add "dark mode" to C:\\x & $HOME  ' }),
    ).toBe('/oh-my-claudecode:ralplan --interactive --deliberate --architect codex "add \\"dark mode\\" to C:\\\\x & $HOME"')
  })

  test('a task that looks like a flag or a keyword is quoted, and one starting with - is warned about', () => {
    const ralph = form('ralph')
    expect(buildCommand('ralph', ralph, { f2: '--critic=codex is broken' })).toBe('/oh-my-claudecode:ralph "--critic=codex is broken"')
    expect(warnings(ralph, { f2: '--critic=codex is broken' })).toEqual(['task description starts with "-"'])
    const team = form('team')
    expect(buildCommand('team', team, { f2: 'ralph the logs' })).toBe('/oh-my-claudecode:team "ralph the logs"')
    expect(buildCommand('team', team, { f2: 'ralph' })).toBe('/oh-my-claudecode:team "ralph"')
    // A plain single word stays bare, so a subcommand still reads as one.
    expect(buildCommand('skill', form('skill'), { f0: 'list' })).toBe('/oh-my-claudecode:skill list')
  })

  test('quoteText', () => {
    expect(quoteText('list', [])).toBe('list')
    expect(quoteText('src/app.ts', [])).toBe('src/app.ts')
    expect(quoteText('ralph', ['ralph'])).toBe('"ralph"')
    expect(quoteText('-x', [])).toBe('"-x"')
    expect(quoteText('a"b', [])).toBe('"a\\"b"')
    expect(quoteText('a\\', [])).toBe('"a\\\\"')
  })

  test("graph keeps the hint's order: the positional first, then its flag", () => {
    expect(buildCommand('graph', form('graph'), { f0: 'describe a pipeline', f1: '/tmp/runs' })).toBe(
      '/oh-my-claudecode:graph "describe a pipeline" --runs-root /tmp/runs',
    )
  })

  test('a value holding whitespace is left out and warned about', () => {
    const fields = form('graph')
    expect(buildCommand('graph', fields, { f0: 'p.json', f1: '/tmp/my runs' })).toBe('/oh-my-claudecode:graph p.json')
    expect(warnings(fields, { f0: 'p.json', f1: '/tmp/my runs' })).toEqual(['--runs-root cannot hold spaces, so it is left out'])
  })

  test('team: the pair joins with a colon; a half-filled pair is left out and warned about', () => {
    const fields = form('team')
    expect(buildCommand('team', fields, { 'f0-left': '3', 'f0-right': 'executor', f1: 'on', f2: 'ship it' })).toBe(
      '/oh-my-claudecode:team 3:executor ralph "ship it"',
    )
    expect(buildCommand('team', fields, { 'f0-left': '3', f2: 'ship it' })).toBe('/oh-my-claudecode:team "ship it"')
    expect(warnings(fields, { 'f0-left': '3', f2: 'ship it' })).toEqual(['N:agent-type needs both parts'])
  })

  test('autopilot --workflow takes the value with a space; empty values add nothing', () => {
    const fields = form('autopilot')
    expect(buildCommand('autopilot', fields, { f0: 'plan-build-qa', f1: 'build it' })).toBe(
      '/oh-my-claudecode:autopilot --workflow plan-build-qa "build it"',
    )
    expect(buildCommand('autopilot', fields, { f0: '  ', f1: '' })).toBe('/oh-my-claudecode:autopilot')
    expect(warnings(fields, { f0: '', f1: '' })).toEqual(['product idea or task description is required'])
  })

  test('a required choice opens on its first option, as it is drawn', () => {
    expect(seedValues(parseHint('--level=a|b [--x=c|d] <t>') ?? [])).toEqual({ f0: '--level=a' })
    expect(seedValues(form('ralph'))).toEqual({})
  })

  test('a choice value that is no option, such as the none sentinel, adds nothing', () => {
    expect(buildCommand('ralph', form('ralph'), { f1: '(none)', f2: 'x' })).toBe('/oh-my-claudecode:ralph x')
    expect(buildCommand('hud', form('hud'), { f0: 'minimal' })).toBe('/oh-my-claudecode:hud minimal')
  })

  test('a toggle adds its text only when on', () => {
    expect(buildCommand('cancel', form('cancel'), { f0: 'on', f1: '' })).toBe('/oh-my-claudecode:cancel --force')
  })
})

describe('hint shapes outside 5.8.6', () => {
  test('`=<value>` joins with =; `--x a|b` is a choice joined by a space', () => {
    expect(parseHint('[--out=<file>]')?.map(shape)).toEqual(['value(--out=<file>)'])
    expect(parseHint('[--mode fast|slow]')?.map(shape)).toEqual(['choice(--mode fast|--mode slow)'])
  })

  test('a bare valued flag is a required value; a bare enum flag a required choice', () => {
    expect(parseHint('--name <n> <task>')?.map(shape)).toEqual(['value(--name <n>, required)', 'text(task, required)'])
    expect(parseHint('--level=a|b')?.map(shape)).toEqual(['choice(--level=a|--level=b, required)'])
  })

  test('shapes the form cannot offer fall back to one free-text field', () => {
    for (const hint of ['[--x', '<task', 'task]', '[--x [--y]]', 'literal <task>', '--always [--y]', '[--x <a> <b>]', '[]', '']) {
      expect(parseHint(hint)).toBeNull()
    }
    const skill = { name: 'odd', description: '', hint: 'literal <task>' }
    expect(formFor(skill)).toEqual({
      fields: [{ kind: 'text', id: 'args', label: 'literal <task>', required: false, verbatim: true }],
      isFallback: true,
    })
    expect(buildCommand('odd', formFor(skill).fields, { args: 'a b --c' })).toBe('/oh-my-claudecode:odd a b --c')
  })

  test('a skill with no hint gets one optional arguments field, not marked as a fallback', () => {
    expect(formFor({ name: 'verify', description: '', hint: null })).toEqual({
      fields: [{ kind: 'text', id: 'args', label: 'arguments', required: false, verbatim: true }],
      isFallback: false,
    })
  })

  test('tokenize keeps a bare flag with its value', () => {
    expect(tokenize('--x <v> [--y]')).toEqual([
      { kind: 'bare', text: '--x <v>' },
      { kind: 'optional', text: '--y' },
    ])
  })
})

describe('frontmatter', () => {
  test('double- and single-quoted values, escapes and plain values with comments', () => {
    const text = [
      '---',
      'name: x',
      'description: "say \\"hi\\" # not a comment"',
      "argument-hint: '[--a] it''s <b>'",
      'role: writer  # DOCUMENTATION ONLY',
      '---',
      'argument-hint: body text is not frontmatter',
    ].join('\n')
    expect(frontmatter(text)).toEqual({
      name: 'x',
      description: 'say "hi" # not a comment',
      'argument-hint': "[--a] it's <b>",
      role: 'writer',
    })
  })

  test('folded and literal blocks are joined; nested lists are skipped', () => {
    const text = ['---', 'description: >', '  one', '  two', 'tags:', '  - a', 'name: y', '---'].join('\n')
    expect(frontmatter(text)).toEqual({ description: 'one two', tags: '', name: 'y' })
  })

  test('no frontmatter, or an unclosed one, is null; so is a skill without it', () => {
    expect(frontmatter('# just a body')).toBeNull()
    expect(frontmatter('---\nname: x\n')).toBeNull()
    expect(skillFrom('x', '# body')).toBeNull()
  })

  test('the directory name is the skill name, whatever the frontmatter name says', () => {
    expect(skillFrom('plan', skillMd('omc-plan', '"<task>"'))).toEqual({
      name: 'plan',
      description: 'Example omc-plan skill for tests',
      hint: '<task>',
    })
    expect(skillFrom('verify', skillMd('verify', null))?.hint).toBeNull()
  })
})

describe('ordering', () => {
  test('main workflows first in their order, then the rest by name', () => {
    const names = ['wiki', 'ralplan', 'ask', 'autoresearch', 'team', 'ultragoal', 'deep-interview', 'ralph', 'autopilot', 'cancel']
    const ordered = orderSkills(names.map(name => ({ name, description: '', hint: null }))).map(s => s.name)
    expect(ordered).toEqual([...MAIN_WORKFLOWS, 'ask', 'cancel', 'wiki'])
  })
})

describe('JSONC config', () => {
  const text = `{
    // a line comment
    "autopilot": {
      /* a block
         comment */
      "workflows": {
        "plan-build-qa": { "version": 1, "stages": ["ralplan", "execution", "qa"], },
        "url-in-string": { "note": "http://example.test/* not a comment */ // nor this" },
      },
    },
  }`

  test('comments go and strings stay, trailing commas included', () => {
    const parsed = parseJsonc(text)
    expect(parsed).not.toBeNull()
    expect(stripJsonc('{"a": "x // y", "b": "\\"/* z */"}')).toBe('{"a": "x // y", "b": "\\"/* z */"}')
    expect(stripJsonc('[1, 2, ]')).toBe('[1, 2 ]')
  })

  test('the workflow names, the project first, without repeats', () => {
    const project = parseJsonc(text)
    const user = parseJsonc('{"autopilot": {"workflows": {"mine": {}, "plan-build-qa": {}}}}')
    expect(configChoices('autopilot', '--workflow', [project, user])).toEqual(['plan-build-qa', 'url-in-string', 'mine'])
    expect(configChoices('autopilot', '--workflow', [null, null])).toEqual([])
    expect(configChoices('ralph', '--workflow', [project])).toEqual([])
  })

  test('as OMC accepts it: a trailing comma before a comment, and a leading BOM', () => {
    expect(parseJsonc('{"a":1, // x\n}')).toEqual({ a: 1 })
    expect(parseJsonc('{"a":1, /* x */ }')).toEqual({ a: 1 })
    expect(parseJsonc('\uFEFF{"a":1}')).toEqual({ a: 1 })
    // A block comment becomes a space, so it still separates tokens.
    expect(stripJsonc('[1/* x */,2]')).toBe('[1 ,2]')
  })

  test('only names OMC admits are offered', () => {
    const config = parseJsonc('{"autopilot": {"workflows": {"ok-1": {}, "Bad": {}, "1st": {}, "has space": {}, "_x": {}}}}')
    expect(configChoices('autopilot', '--workflow', [config])).toEqual(['ok-1'])
  })

  test('a broken or non-object config is null, and a non-object table gives nothing', () => {
    expect(parseJsonc('{"a": 1 /* never closed')).toBeNull()
    expect(parseJsonc('{ nope')).toBeNull()
    expect(parseJsonc('[1]')).toBeNull()
    expect(configChoices('autopilot', '--workflow', [{ autopilot: { workflows: ['a'] } }])).toEqual([])
  })
})

describe('finding OMC', () => {
  test('versions compare numerically', () => {
    expect(compareVersions('5.10.0', '5.8.6')).toBeGreaterThan(0)
    expect(compareVersions('5.8.6', '5.8.6')).toBe(0)
    expect(compareVersions('5.8', '5.8.1')).toBeLessThan(0)
    expect(highestVersion(['5.5.0', '5.10.1', '5.8.6', 'notes', '.DS_Store'])).toBe('5.10.1')
    expect(highestVersion(['notes'])).toBeNull()
  })

  test('a release ranks above its prereleases; build metadata is ignored', () => {
    expect(compareVersions('5.9.0', '5.9.0-beta.1')).toBeGreaterThan(0)
    expect(compareVersions('5.9.0-beta.2', '5.9.0-beta.10')).toBeLessThan(0)
    expect(compareVersions('5.9.0-beta', '5.9.0-beta.1')).toBeLessThan(0)
    expect(compareVersions('5.9.0-rc.1', '5.8.6')).toBeGreaterThan(0)
    expect(compareVersions('5.9.0+build.7', '5.9.0')).toBe(0)
    expect(highestVersion(['5.9.0-beta.1', '5.9.0', '5.8.6'])).toBe('5.9.0')
  })

  test('installed_plugins.json: the highest usable entry for this session', () => {
    const json = JSON.stringify({
      version: 2,
      plugins: {
        'oh-my-claudecode@omc': [
          { scope: 'user', installPath: '/c/omc/5.8.4', version: '5.8.4' },
          { scope: 'project', projectPath: '/elsewhere', installPath: '/c/omc/9.0.0', version: '9.0.0' },
          { scope: 'project', projectPath: '/work', installPath: '/c/omc/5.8.6', version: '5.8.6' },
        ],
        'other@x': [{ scope: 'user', installPath: '/c/other', version: '99' }],
      },
    })
    expect(installPathFrom(json, '/work')).toBe('/c/omc/5.8.6')
    expect(installPathFrom(json, '/work/sub/dir')).toBe('/c/omc/5.8.6')
    expect(installPathFrom(json, '/workshop')).toBe('/c/omc/5.8.4')
    expect(installPathFrom(json, '/home')).toBe('/c/omc/5.8.4')
    expect(installPathFrom('{"plugins": {}}', '/work')).toBeNull()
    expect(installPathFrom('not json', '/work')).toBeNull()
  })
})
