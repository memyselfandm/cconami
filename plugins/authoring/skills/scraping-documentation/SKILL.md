---
name: scraping-documentation
description: Scrapes documentation websites and converts content to organized markdown files for local reference. Use when you need offline documentation, want to add library docs to ai_docs/knowledge/, or need to create local reference materials.
---

# Scraping Documentation

Scrape documentation sites and convert to organized markdown files.

## Usage

```
/scraping-documentation <url> [options]
```

## Arguments

**URL** (required):
- Base URL of documentation site (e.g., `https://docs.example.com`)

**Options:**
- `--output DIR`: Output directory (default: `./docs`)
- `--depth N`: How many levels to crawl (default: 2)
- `--include PATTERN`: Only include URLs matching pattern
- `--exclude PATTERN`: Exclude URLs matching pattern
- `--format FORMAT`: Output format (markdown|html|both)
- `--index`: Generate index file

## Examples

```bash
# Scrape library documentation
/scraping-documentation https://docs.example.com --output ai_docs/knowledge/example

# Limited depth crawl
/scraping-documentation https://api.example.com/docs --depth 1

# Include only API reference
/scraping-documentation https://docs.example.com --include "/api/*"

# Exclude changelog pages
/scraping-documentation https://docs.example.com --exclude "/changelog/*"
```

## Workflow

### Step 1: Discover Pages

```python
# Start from base URL
base_url = args.url
discovered = set()
to_crawl = [base_url]

while to_crawl and len(discovered) < max_pages:
    url = to_crawl.pop(0)

    if url in discovered:
        continue

    if not matches_include(url) or matches_exclude(url):
        continue

    # Fetch page
    content = fetch_url(url)

    # Extract links
    links = extract_links(content, base_url)

    # Add to queue (respect depth)
    depth = get_depth(url, base_url)
    if depth < max_depth:
        to_crawl.extend(links)

    discovered.add(url)
```

### Step 2: Fetch and Convert

```python
for url in discovered:
    # Fetch content
    html = fetch_url(url)

    # Convert to markdown
    markdown = html_to_markdown(html)

    # Clean up
    markdown = clean_markdown(markdown)

    # Determine output path
    path = url_to_filepath(url, output_dir)

    # Write file
    write_file(path, markdown)
```

### Step 3: HTML to Markdown Conversion

Handle common documentation patterns:
- Code blocks with syntax highlighting
- Tables
- Admonitions/callouts
- Navigation (strip)
- Headers (preserve hierarchy)
- Links (convert to relative)
- Images (download and reference locally)

### Step 4: Generate Index

```markdown
# {Site Name} Documentation

Scraped from: {base_url}
Date: {timestamp}

## Contents

{for section in sections:}
### {section.title}
{for page in section.pages:}
- [{page.title}]({page.path})
```

### Step 5: Report

```markdown
## Scraping Complete

### Summary
- Base URL: {base_url}
- Pages scraped: {count}
- Output directory: {output_dir}
- Total size: {size}

### Files Created
{for file in files:}
- {file.path} ({file.size})

### Structure
{directory tree}

### Next Steps
Add to CLAUDE.md:
```markdown
## Documentation
@{output_dir}/index.md
```
```

## Output Structure

```
ai_docs/knowledge/example/
├── index.md              # Table of contents
├── getting-started.md    # Converted pages
├── api/
│   ├── index.md
│   ├── authentication.md
│   └── endpoints.md
├── guides/
│   ├── index.md
│   └── quickstart.md
└── _assets/              # Downloaded images
    └── diagram.png
```

## Conversion Rules

### Code Blocks
```html
<pre><code class="language-python">print("hello")</code></pre>
```
→
````markdown
```python
print("hello")
```
````

### Tables
HTML tables → Markdown tables

### Callouts
```html
<div class="warning">Important note</div>
```
→
```markdown
> ⚠️ **Warning**: Important note
```

### Navigation
Strip navigation, sidebars, footers - keep content only.

## Error Handling

| Issue | Action |
|-------|--------|
| 404 page | Skip and log |
| Rate limited | Back off and retry |
| Login required | Report and skip |
| JavaScript rendered | Warn (content may be incomplete) |
| Large file | Skip with warning |

## Best Practices

1. **Respect robots.txt** - Check before scraping
2. **Rate limiting** - Don't overload servers
3. **Attribution** - Keep source URL in files
4. **Updates** - Re-run periodically to update
5. **Selection** - Use include/exclude to get relevant content only
