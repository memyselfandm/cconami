---
allowed-tools: Task, Read, Write, Glob
argument-hint: <filename> <prompt>
description: Create comprehensive context bundles from scraped documentation using context engineering
---

# Bundle Context Command

Transform scraped documentation into comprehensive context bundles optimized for AI agents. This command leverages the context-engineering-subagent to analyze documentation and create structured, navigable context guides.

## Usage

```bash
# Basic usage - create a context guide from scraped docs
/bundle-context docs/browser-use/browser-use_guide.md "Create a high-level browser-use guide for AI coding agents"

# Custom requirements with specific focus
/bundle-context ai_docs/knowledge/langchain_context.md "Analyze scraped LangChain docs focusing on agents and chains integration"

# Framework-specific context bundle
/bundle-context context/supabase_guide.md "Create comprehensive Supabase integration guide with authentication and real-time features"
```

## What This Command Does

1. **Validates parameters** - ensures filename and prompt are provided
2. **Discovers documentation** - finds relevant scraped documentation files
3. **Delegates to context-engineering-subagent** - leverages specialized context engineering capabilities
4. **Creates structured output** - produces comprehensive context bundles at specified location

## Implementation

### Step 1: Parse and Validate Arguments

First, let me parse the arguments and validate the inputs:

!```python -c "
import sys
import os
from pathlib import Path

# Parse arguments
args = '$ARGUMENTS'.strip().split(maxsplit=1)
if len(args) < 2:
    print('Error: Please provide both filename and prompt')
    print('Usage: /bundle-context <filename> <prompt>')
    sys.exit(1)

filename = args[0]
prompt = args[1]

print(f'📁 Target file: {filename}')
print(f'📝 User prompt: {prompt[:100]}...' if len(prompt) > 100 else f'📝 User prompt: {prompt}')

# Validate output directory exists or can be created
output_path = Path(filename)
output_dir = output_path.parent

if output_dir != Path('.'):
    output_dir.mkdir(parents=True, exist_ok=True)
    print(f'✅ Output directory ready: {output_dir}')

# Store for next step
import json
with open('bundle_context_config.json', 'w') as f:
    json.dump({
        'filename': filename,
        'prompt': prompt,
        'step': 'validated'
    }, f)

print('✅ Arguments validated and ready for context engineering')
"```

### Step 2: Discover Available Documentation

Now let me find the relevant documentation to analyze:

!```python -c "
import json
import os
from pathlib import Path
import glob

# Load config
with open('bundle_context_config.json', 'r') as f:
    config = json.load(f)

filename = config['filename']
prompt = config['prompt']

print('🔍 Discovering available documentation...')

# Common documentation patterns to search
doc_patterns = [
    'docs/**/*.md',
    'ai_docs/**/*.md', 
    '**/*-docs-structure.yaml',
    'documentation/**/*.md',
    '**/scraped_docs/**/*.md'
]

found_docs = []
for pattern in doc_patterns:
    matches = glob.glob(pattern, recursive=True)
    found_docs.extend(matches)

# Remove duplicates and sort
found_docs = sorted(list(set(found_docs)))

print(f'📚 Found {len(found_docs)} documentation files:')
for i, doc in enumerate(found_docs[:10]):  # Show first 10
    print(f'  {i+1:2d}. {doc}')

if len(found_docs) > 10:
    print(f'  ... and {len(found_docs) - 10} more files')

# Update config
config['found_docs'] = found_docs
config['step'] = 'discovered'

with open('bundle_context_config.json', 'w') as f:
    json.dump(config, f)

print('✅ Documentation discovery complete')
"```

### Step 3: Execute Context Engineering

Now I'll delegate to the context-engineering-subagent with a comprehensive prompt that combines your requirements with context bundling best practices:

Use the Task tool to invoke the context-engineering-subagent with the following comprehensive prompt that incorporates the user's specific requirements along with proven context bundling patterns:

**Context Engineering Task**: Create a comprehensive context bundle from the discovered documentation files for AI agent consumption. Your analysis should incorporate the user's specific requirements: **"$prompt"**

**Output Location**: Save the final context bundle to: **$filename**

**Required Context Bundle Structure**:
- **High-level summary** of the technology/framework, its capabilities, and core components
- **Component summaries** for each major component, including what each component does and how it works
- **Document tree** that lists each documentation file and provides a brief summary of what that document contains (create a navigable map for AI agents)
- **Integration patterns** showing how components work together
- **Usage guidance** for AI agents on when and how to use different capabilities
- **Cross-references** between related concepts and components

**Discovery Results**: The following documentation files have been discovered and should be analyzed:
- Review all files found in the discovery step
- Prioritize markdown files and structured documentation
- Include YAML structure files if available
- Focus on files that match the user's prompt requirements

**Quality Standards**:
- Create content optimized for AI agent consumption
- Use clear hierarchical structure with proper markdown formatting
- Include specific file references so agents know where to find detailed information
- Balance comprehensiveness with clarity
- Ensure the guide serves as both overview and navigation tool

Please analyze the discovered documentation and create the context bundle according to these specifications and the user's custom requirements.

### Step 4: Cleanup

!```python -c "
import os
import json

# Load final config
try:
    with open('bundle_context_config.json', 'r') as f:
        config = json.load(f)
    
    filename = config['filename']
    doc_count = len(config.get('found_docs', []))
    
    print(f'🎉 Context bundle creation completed!')
    print(f'📁 Output: {filename}')
    print(f'📚 Analyzed {doc_count} documentation files')
    print(f'✨ Ready for AI agent consumption')
    
    # Cleanup temp file
    os.remove('bundle_context_config.json')
    print('🧹 Cleaned up temporary files')
    
except Exception as e:
    print(f'Note: {e}')
"```

## Features

✅ **Flexible Requirements**: Custom prompts for specific use cases  
✅ **Smart Discovery**: Automatically finds relevant documentation  
✅ **Expert Processing**: Leverages context-engineering-subagent expertise  
✅ **Structured Output**: Creates navigable context guides  
✅ **Path Flexibility**: Supports any output location  
✅ **Documentation Integration**: Works seamlessly with scrape-docs output  

## Output Structure

The context bundle will be saved to your specified filename with comprehensive structure including:

- **High-level overview** of the technology/framework
- **Component summaries** with capabilities and use cases  
- **Document tree** showing all source files and their contents
- **Integration patterns** for common workflows
- **AI agent guidance** for effective usage

Perfect for feeding into AI coding agents that need deep understanding of a technology stack!