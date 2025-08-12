# Hooks
This directory contains *scripts* that can execute on different claude code hooks. 

Hooks are configured in the `./claude/settings.json` file.

## UV Single-File Scripts Architecture

This project leverages **[UV single-file scripts](https://docs.astral.sh/uv/guides/scripts/)** to keep hook logic cleanly separated from your main codebase. All hooks live in `.claude/hooks/` as standalone Python scripts with embedded dependency declarations.

**Benefits:**
- **Isolation** - Hook logic stays separate from your project dependencies
- **Portability** - Each hook script declares its own dependencies inline
- **No Virtual Environment Management** - UV handles dependencies automatically
- **Fast Execution** - UV's dependency resolution is lightning-fast
- **Self-Contained** - Each hook can be understood and modified independently

This approach ensures your hooks remain functional across different environments without polluting your main project's dependency tree.

(Credit to IndieDevDan for this architecture)