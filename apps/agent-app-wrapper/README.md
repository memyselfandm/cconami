# Agentic Coding Application Wrapper

## Summary
This script initializes a project with an "Agentic Layer" (credit: IndyDevDan) that makes it easy to use coding agents (i.e. claude code) at maximum scale on the application. The layer is an opinionated folder structure that *wraps* the main application and adds additional context and tools for AI coding agents (e.g. Claude Code).

## The "Agentic Layer"/"Agentic Wrapper"

### `ai_docs/`: AI Context
The `ai_docs` folder contains important context information for AI coding agents:

#### `ai_docs/knowledge/`: Knowledge Repository
This folder should contain any documentation (3rd party Library documentation,...) that is important for coding agents to reliably understand and work on the codebase. Docs should be saved in well-structured markdown format.

Easy ways to get docs:
- Many AI-forward documentation sites now include a "save as markdown" button
- There are libraries and websites and APIs that will process websites into markdown

More advanced ways to get docs:
- Have AI look at a list of relevant documentation and generate a custom context file (similar to llm.txt).
- See crawl4AI's docs about providing context (todo: ref url)

#### `ai_docs/prds`: Requirements (Plans)
This folder should contain PRDs, design docs, specs, or other such **detailed** plans for coding agents to execute against.

**TODO:**
- probably come up with a standard format for such a file and save it in this repo
- i think one thing missing from IDD's implementation is task management (e.g. a backlog)
    - i think this functionality could have its own script or `/` command to initialize a task file for a given requirements doc (the slash command would be nto give a detailed prompt about how to process the PRD ad what format to output the backlog in)

### `apps/`: Application Source Code
This folder contains the main application source code. 
This folder can contain any number of sub-folders, as needed by the project. For example, there could be a `apps/backend/` and `apps/frontend/` folder for the respective parts of the application.
Microservices projects could contain even more folders.

###  `.claude/`: Claude Code Enhancements
The script will not overwrite any existing files/folders if they exist.

#### `.claude/hooks`: Claude Code hooks
#### `.claude/commands`: Claude Code slash-commands
#### `.claude/agents`: Claude Code Sub-Agents

### Source Control
Generally, the root folder of the project (including the agentic layer) should be checked into source control.
The `worktrees/` folder and certain folders under  `.claude/` should be git-ignored.

## Project TODO
- add safety checks for existing folders to make sure nothing gets blown away by running this command
- add to the script the files/folders to gitignore
- write a markdown file about the agentic wrapper, have the script install that markdown file into `ai_docs` and then inject a reference to it into CLAUDE.md/README.md.
    - maybe make this a flag on the script