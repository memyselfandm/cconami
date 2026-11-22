import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Catalog, Field, Skill, Wizard } from '../types'
import {
  buildArgs,
  buildCommand,
  commandName,
  configChoices,
  formFor,
  highestVersion,
  installPathFrom,
  join,
  OMC_NAMESPACE,
  orderSkills,
  parseJsonc,
  seedValues,
  skillFrom,
  warnings,
} from './logic'

// /omc opens a three-step wizard over the installed oh-my-claudecode skills:
// pick a skill, fill one field per part of its argument-hint, review the exact
// command line and run it as the person would by typing it. The mod only reads
// files; running that command is the one thing it does.
export const PANE = 'omc-launcher'
export const COMMAND = 'omc'
const TITLE = 'OMC launcher'

/** A Select value that matches no option's emitted text: the "leave it out" choice. */
export const NONE = '(none)'

const START: Wizard = { step: 'pick', skill: null, values: {}, isArmed: false }
const wizard = atom({ plugin: 'omc-launcher', key: 'wizard' } as const, START, { shape: 'wizard-2' })
const catalog = atom({ plugin: 'omc-launcher', key: 'catalog' } as const, { skills: [], choices: {} } as Catalog, {
  shape: 'catalog-1',
})

type Places = { configDir: string; userConfig: string }

async function places($: EngineInterface): Promise<Places> {
  const home = (await $.env.get('HOME')) || ''
  const configDir = (await $.env.get('CLAUDE_CONFIG_DIR')) || join(home, '.claude')
  // OMC's getConfigDir(): XDG_CONFIG_HOME, else ~/.config.
  const xdg = (await $.env.get('XDG_CONFIG_HOME')) || join(home, '.config')

  return { configDir, userConfig: join(xdg, 'claude-omc', 'config.jsonc') }
}

/**
 * The OMC skills this session can run, by bare name: the session's
 * `oh-my-claudecode:*` commands. Empty when OMC is not active here.
 */
async function omcCommands($: EngineInterface): Promise<string[]> {
  const prefix = `${OMC_NAMESPACE}:`
  const names = (await $.command.list().catch(() => []))
    .map(command => command.name)
    .filter(name => name.startsWith(prefix))
    .map(name => name.slice(prefix.length))

  return [...new Set(names)]
}

/** True when the directory holds a skills folder. */
async function hasSkills($: EngineInterface, root: string): Promise<boolean> {
  return $.fs.exists(join(root, 'skills')).catch(() => false)
}

/**
 * The installed OMC plugin's folder: installed_plugins.json's entry for
 * oh-my-claudecode@omc, else the highest version in the plugin cache. Null
 * when OMC is not installed.
 */
export async function findOmc($: EngineInterface, cwd: string): Promise<string | null> {
  const { configDir } = await places($)
  const plugins = join(configDir, 'plugins')
  const installed = await $.fs.read(join(plugins, 'installed_plugins.json')).catch(() => null)
  if (typeof installed === 'string') {
    const path = installPathFrom(installed, cwd)
    if (path !== null && (await hasSkills($, path))) {
      return path
    }
  }
  const cache = join(plugins, 'cache', 'omc', 'oh-my-claudecode')
  const entries = await $.fs.list(cache).catch(() => [])
  const version = highestVersion(entries.filter(entry => entry.kind === 'dir').map(entry => entry.name))
  if (version !== null && (await hasSkills($, join(cache, version)))) {
    return join(cache, version)
  }

  return null
}

/**
 * The runnable skills that have a `<root>/skills/<name>/SKILL.md` with
 * frontmatter, main workflows first. A command with no such file (one of OMC's
 * `commands/*.md`, or an alias) is not a skill and is left out.
 */
async function readSkills($: EngineInterface, root: string, names: readonly string[]): Promise<Skill[]> {
  const found = await Promise.all(
    names.map(async name => {
      const text = await $.fs.read(join(root, 'skills', name, 'SKILL.md')).catch(() => null)

      return typeof text === 'string' ? skillFrom(name, text) : null
    }),
  )

  return orderSkills(found.filter((skill): skill is Skill => skill !== null))
}

/** Config choices for every valued flag, from the project's and the user's OMC config. */
async function readChoices($: EngineInterface, cwd: string, skills: readonly Skill[]): Promise<Record<string, string[]>> {
  const { userConfig } = await places($)
  const paths = [join(cwd, '.claude', 'omc.jsonc'), userConfig]
  const configs = await Promise.all(
    paths.map(async path => {
      const text = await $.fs.read(path).catch(() => null)

      return typeof text === 'string' ? parseJsonc(text) : null
    }),
  )
  const choices: Record<string, string[]> = {}
  for (const skill of skills) {
    for (const field of formFor(skill).fields) {
      if (field.kind !== 'value') {
        continue
      }
      const names = configChoices(skill.name, field.flag, configs)
      if (names.length > 0) {
        choices[`${skill.name} ${field.flag}`] = names
      }
    }
  }

  return choices
}

/** Sets one value; any change disarms a pending Run anyway. */
async function setValue($: EngineInterface, key: string, value: string): Promise<void> {
  await update($, wizard, w => ({ ...w, values: { ...w.values, [key]: value }, isArmed: false }))
}

/** Flips a toggle from its current value, not the one it was drawn with. */
async function flip($: EngineInterface, key: string): Promise<void> {
  await update($, wizard, w => ({ ...w, values: { ...w.values, [key]: w.values[key] === 'on' ? '' : 'on' }, isArmed: false }))
}

async function finish($: EngineInterface): Promise<void> {
  await update($, wizard, () => START)
  await $.ui.close({ id: PANE })
}

function short(text: string, room: number): string {
  return text.length <= room ? text : `${text.slice(0, Math.max(0, room - 3))}...`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // Without OMC's commands in this session there is nothing to launch, so
    // /omc is not offered.
    if ((await omcCommands($)).length > 0) {
      await $.command.register({
        name: 'omc',
        description: 'Pick an oh-my-claudecode workflow, set its options and run it',
      })
    }

    return next(e)
  })

  on('command.run', { command: 'omc' }, async $ => {
    const names = await omcCommands($)
    if (names.length === 0) {
      return { text: 'oh-my-claudecode is not active in this session, so there is nothing to launch.' }
    }
    const cwd = await $.session.cwd()
    const root = await findOmc($, cwd)
    if (root === null) {
      return { text: 'The oh-my-claudecode plugin folder was not found, so its skills cannot be read.' }
    }
    const skills = await readSkills($, root, names)
    if (skills.length === 0) {
      return { text: `No oh-my-claudecode skills were found under ${root}/skills.` }
    }
    const choices = await readChoices($, cwd, skills)
    await update($, catalog, () => ({ skills, choices }))
    await update($, wizard, () => START)
    await $.ui.open({ id: PANE, title: TITLE, focus: true, closeOnEscape: true })

    return { text: `OMC launcher opened: ${skills.length} skills.` }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Input, Select, Text } = $.ui.resolve(e)
    const w = await read($, wizard)
    const { skills, choices } = await read($, catalog)
    const columns = Math.max(20, e.props.bodyColumns)
    const cancel = (
      <Button
        key="cancel"
        label="Cancel"
        onPress={() => {
          void finish($)
        }}
      />
    )
    const back = (step: Wizard['step']) => (
      <Button
        key="back"
        label="Back"
        onPress={() => {
          void update($, wizard, (x): Wizard => ({ ...x, step, isArmed: false }))
        }}
      />
    )
    const skill = skills.find(s => s.name === w.skill)

    if (w.step === 'pick' || skill === undefined) {
      if (skills.length === 0) {
        return <Text dimColor>Run /{COMMAND} to read the installed oh-my-claudecode skills.</Text>
      }

      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>Step 1 of 3: pick a workflow</Text>
          <Select
            key="skill"
            label="Skill"
            autoFocus
            options={skills.map(s => {
              // The name always shows; only the description gives way.
              const room = columns - 12 - s.name.length

              return { value: s.name, label: s.description === '' || room < 4 ? s.name : `${s.name}: ${short(s.description, room)}` }
            })}
            onSelect={value => {
              const picked = skills.find(s => s.name === value)
              const values = picked === undefined ? {} : seedValues(formFor(picked).fields)
              void update($, wizard, (): Wizard => ({ step: 'form', skill: value, values, isArmed: false }))
            }}
          />
          <Box gap={1}>{cancel}</Box>
        </Box>
      )
    }

    const { fields, isFallback } = formFor(skill)

    if (w.step === 'review') {
      const command = buildCommand(skill.name, fields, w.values)
      const args = buildArgs(fields, w.values)
      const warned = warnings(fields, w.values)
      const run = async () => {
        // A command with warnings (an empty task starts an autonomous run on
        // nothing) needs a second press: the first only arms it.
        if (warned.length > 0 && !(await read($, wizard)).isArmed) {
          await update($, wizard, (x): Wizard => ({ ...x, isArmed: true }))

          return
        }
        await finish($)
        // A prompt beginning with / is refused by $.prompt.submit, so the skill
        // runs through $.command.run: as if the person typed the line.
        await $.command.run({ command: commandName(skill.name), args })
      }

      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>Step 3 of 3: review and run</Text>
          <Text wrap="wrap">
            {command}
          </Text>
          {warned.map(warning => (
            <Box key={`warning-${warning}`}>
              <Text color="warning">{warning}</Text>
            </Box>
          ))}
          {w.isArmed && <Text color="warning">Press Run anyway again to run it as shown.</Text>}
          <Box gap={1}>
            <Button
              key="run"
              label={warned.length > 0 ? 'Run anyway' : 'Run'}
              onPress={() => {
                void run().catch((error: unknown) => {
                  $.ui.toast(`Could not run ${command}: ${error instanceof Error ? error.message : String(error)}`)
                })
              }}
            />
            {back('form')}
            {cancel}
          </Box>
        </Box>
      )
    }

    const fieldElement = (field: Field) => {
      switch (field.kind) {
        case 'toggle': {
          const isOn = w.values[field.id] === 'on'

          return (
            <Button
              key={field.id}
              label={`[${isOn ? 'x' : ' '}] ${field.label}`}
              onPress={() => {
                void flip($, field.id)
              }}
            />
          )
        }
        case 'choice': {
          const options = [
            ...(field.required ? [] : [{ value: NONE, label: NONE }]),
            ...field.options.map(option => ({ value: option.emit, label: option.label })),
          ]
          const current = w.values[field.id]

          return (
            <Select
              key={field.id}
              label={field.label}
              options={options}
              value={options.some(option => option.value === current) ? current : (options[0]?.value ?? NONE)}
              onSelect={value => {
                void setValue($, field.id, value)
              }}
            />
          )
        }
        case 'value': {
          const names = choices[`${skill.name} ${field.flag}`] ?? []
          const current = w.values[field.id] ?? ''

          return (
            <Box flexDirection="column">
              {names.length > 0 && (
                <Select
                  key={`${field.id}-pick`}
                  label={`${field.flag} from config`}
                  options={[NONE, ...names].map(name => ({ value: name, label: name }))}
                  value={names.includes(current) ? current : NONE}
                  onSelect={value => {
                    void setValue($, field.id, value === NONE ? '' : value)
                  }}
                />
              )}
              <Input
                key={field.id}
                label={field.flag}
                placeholder={field.placeholder}
                value={current}
                onInput={value => {
                  void setValue($, field.id, value)
                }}
                onSubmit={value => {
                  void setValue($, field.id, value)
                }}
              />
            </Box>
          )
        }
        case 'pair':
          return (
            <Box gap={1}>
              {[field.left, field.right].map((part, i) => {
                const key = `${field.id}-${i === 0 ? 'left' : 'right'}`

                return (
                  <Input
                    key={key}
                    label={part}
                    placeholder={part}
                    value={w.values[key] ?? ''}
                    onInput={value => {
                      void setValue($, key, value)
                    }}
                    onSubmit={value => {
                      void setValue($, key, value)
                    }}
                  />
                )
              })}
            </Box>
          )
        case 'text':
          return (
            <Input
              key={field.id}
              label={field.required ? `${field.label} (required)` : field.label}
              placeholder={field.label}
              rows={field.required ? 3 : 1}
              value={w.values[field.id] ?? ''}
              onInput={value => {
                void setValue($, field.id, value)
              }}
              onSubmit={value => {
                void setValue($, field.id, value)
              }}
            />
          )
      }
    }

    return (
      <Box flexDirection="column" gap={1}>
        <Text bold>Step 2 of 3: {skill.name} options</Text>
        {skill.hint !== null && <Text dimColor>{skill.hint}</Text>}
        {isFallback && <Text color="warning">This hint did not parse: type the arguments as one line.</Text>}
        {fields.map(fieldElement)}
        <Box gap={1}>
          <Button
            key="next"
            label="Review"
            onPress={() => {
              void update($, wizard, (x): Wizard => ({ ...x, step: 'review' }))
            }}
          />
          {back('pick')}
          {cancel}
        </Box>
      </Box>
    )
  })
}
