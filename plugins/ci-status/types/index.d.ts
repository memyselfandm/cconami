/** One check, from a check run or a commit status, reduced to three states. */
export type CheckState = 'pass' | 'fail' | 'pending'

export type Check = { name: string; state: CheckState }

/** The checks on one commit, reduced to one state and counts. */
export type Summary = {
  /** `fail` when any check failed, else `pending` when any runs, else `pass`. */
  state: CheckState
  total: number
  /** Checks that succeeded, or ended neutral or skipped. */
  passed: number
  /** Checks that have finished, whatever their outcome. */
  done: number
  /** The names of the failing checks. */
  failing: string[]
}

/** The CI state of the current branch's HEAD commit. */
export type Head = {
  /** The session's working directory the state was read in. */
  cwd: string
  branch: string
  sha: string
  summary: Summary
  /** The number of the branch's open PR, or null. */
  pr: number | null
  /** The URL of the branch's open PR, or null. */
  prUrl: string | null
}

/** A PR this session opened, and the CI state of its head. */
export type OpenedPr = {
  url: string
  number: number
  /** `OPEN`, `MERGED` or `CLOSED`, as `gh` reports it; empty before it is read. */
  state: string
  summary: Summary | null
  /** Reads that failed in a row; the PR is drawn only while this is 0. */
  failures: number
}

/** What the band draws. */
export type View = {
  /** Null hides the current branch's part of the band. */
  head: Head | null
  opened: OpenedPr[]
  /** True when the last read failed in `gh` itself: the whole band hides. */
  isOffline: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'ci-status': { view: Shaped<View> }
  }
}
