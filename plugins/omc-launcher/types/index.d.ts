/** One OMC skill as the picker lists it. */
export type Skill = {
  /** The skill's directory name: what `/oh-my-claudecode:<name>` runs. */
  name: string
  /** The frontmatter `description`, or an empty string. */
  description: string
  /** The frontmatter `argument-hint`, or null when it has none. */
  hint: string | null
}

/** One form field, parsed from one part of an argument-hint. */
export type Field =
  | {
      /** A bare flag or keyword, such as `[--deliberate]` or `[ralph]`: on or off. */
      kind: 'toggle'
      id: string
      label: string
      /** The text it adds when on. */
      emit: string
    }
  | {
      /** One of several, such as `[--critic=architect|critic|codex]`. */
      kind: 'choice'
      id: string
      label: string
      /** Each option's label and the text it adds. */
      options: { label: string; emit: string }[]
      required: boolean
    }
  | {
      /** A flag with a typed value, such as `[--workflow <name>]`. */
      kind: 'value'
      id: string
      flag: string
      /** `' '` for `--x <v>`, `'='` for `--x=<v>`. */
      joiner: ' ' | '='
      placeholder: string
      required: boolean
    }
  | {
      /** A structured `[A:B]` pair, such as team's `[N:agent-type]`. */
      kind: 'pair'
      id: string
      left: string
      right: string
    }
  | {
      /** Positional text, such as `<task description>`, quoted when it could be misread. */
      kind: 'text'
      id: string
      label: string
      required: boolean
      /** True for the fallback free-text arguments field, which goes in exactly as typed. */
      verbatim: boolean
    }

/** Where the wizard is. */
export type Wizard = {
  step: 'pick' | 'form' | 'review'
  /** The picked skill's name, or null on the first step. */
  skill: string | null
  /** Field values by field id (a pair's halves at `<id>-left` and `<id>-right`; a toggle is `on`). */
  values: Record<string, string>
  /** True once Run anyway has been pressed on a command with warnings; the next press runs it. */
  isArmed: boolean
}

/** What /omc read when it was last run. */
export type Catalog = {
  /** The OMC skills, main workflows first. */
  skills: Skill[]
  /** Config choices by `<skill> <flag>`, such as `autopilot --workflow`. */
  choices: Record<string, string[]>
}

declare module 'claude-code' {
  interface PluginState {
    'omc-launcher': {
      wizard: Shaped<Wizard>
      catalog: Shaped<Catalog>
    }
  }
}
