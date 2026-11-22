// Every argument-hint shipped by oh-my-claudecode 5.8.6, keyed by skill
// directory, written exactly as it appears in that skill's SKILL.md frontmatter
// (quoted or not). The SKILL.md texts built from them are synthetic: only the
// hints are copied, the names and descriptions around them are made up.

export const HINTS_5_8_6: Record<string, string> = {
  'architecture-survey': '"[optional directory or area to survey]"',
  'ask-navigator': '"<loose idea | residual questions | map link or number | nothing to continue the open map>"',
  autopilot: '"[--workflow <name>] <product idea or task description>"',
  cancel: '"[--force] [--all]"',
  'deep-interview': '"[--frontier] [--autoresearch] <idea or vague description>"',
  drydock: '"[--check]"',
  'external-context': '<search query or topic>',
  graph: '"<descriptor.json | describe the pipeline> [--runs-root <dir>]"',
  harbor: '"[sweep | look at #N | sign ... | what\'s ready?]"',
  hud: '"[setup|minimal|focused|full|status]"',
  intent: '"<pasted feedback / chat log | path to existing intent.md | nothing to continue open review>"',
  launch: '"<mission brief | path to existing spec> [--serial]"',
  map: '"[what are you trying to do]"',
  plan: '"[--direct|--consensus|--review] [--interactive] [--deliberate] <task description>"',
  ralph: '"[--no-deslop] [--critic=architect|critic|codex] <task description>"',
  ralplan: '"[--interactive] [--deliberate] [--architect codex] [--critic codex] <task description>"',
  'session-flow': '"[short|reset]"',
  skill: '"<command> [args]"',
  team: '"[N:agent-type] [ralph] <task description>"',
  trace: '"<observation to trace>"',
  ultragoal: '"<brief or subcommand>"',
}

/** A synthetic SKILL.md: frontmatter with the given hint line (or none), and a body. */
export function skillMd(name: string, hint: string | null, extra = ''): string {
  return [
    '---',
    `name: ${name}`,
    `description: "Example ${name} skill for tests"`,
    ...(hint === null ? [] : [`argument-hint: ${hint}`]),
    'level: 3',
    extra,
    '---',
    '',
    `# ${name}`,
    '',
    'Body text that the launcher never reads.',
  ]
    .filter(line => line !== '')
    .join('\n')
}
