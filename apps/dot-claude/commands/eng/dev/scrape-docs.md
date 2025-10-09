---
allowed-tools: WebFetch, Write, Bash(python:*)
argument-hint: <root-docs-url> [output-folder]
description: Scrape documentation sites and convert to organized markdown files
---

# Documentation Scraper Command

This command scrapes documentation websites, analyzes their structure, and downloads all content as organized markdown files. It automatically detects the documentation platform, prefers markdown sources when available, and maintains the site's navigation structure.

## Usage

```bash
# Basic usage - creates 'docs/' folder in current directory
/scrape-docs https://docs.browser-use.com/

# Custom output folder
/scrape-docs https://docs.langchain.com/ ./langchain-docs/

# Another example
/scrape-docs https://docs.anthropic.com/en/docs/ ./anthropic-docs/
```

## What This Command Does

1. **Analyzes the documentation site** to understand its structure and platform
2. **Detects markdown sources** (GitHub repos, direct .md links) when available
3. **Generates a clean YAML structure file** showing the site organization
4. **Downloads all documentation** with intelligent naming: `[site]_[section]_[filename].md`
5. **Converts HTML to markdown** only when raw markdown isn't available
6. **Respects rate limits** and crawling best practices

## Implementation

### Step 1: Analyze the Documentation Site

Let me fetch the root documentation page to analyze its structure:

!```python -c "
import sys
import re
import json
from urllib.parse import urljoin, urlparse
from pathlib import Path

# Get arguments
args = '$ARGUMENTS'.strip().split()
if not args:
    print('Error: Please provide a documentation URL')
    sys.exit(1)

root_url = args[0]
output_folder = args[1] if len(args) > 1 else 'docs'

print(f'Analyzing documentation site: {root_url}')
print(f'Output folder: {output_folder}')

# Store for next step
with open('scrape_config.json', 'w') as f:
    json.dump({
        'root_url': root_url,
        'output_folder': output_folder,
        'step': 'analyze'
    }, f)
"```

### Step 2: Fetch Site Content and Generate Structure

Now I'll fetch the site content and analyze its structure:

!```python -c "
import json
import sys
import os
from pathlib import Path

# Load config
try:
    with open('scrape_config.json', 'r') as f:
        config = json.load(f)
    root_url = config['root_url']
    output_folder = config['output_folder']
except:
    print('Error: Run step 1 first')
    sys.exit(1)

print('Step 2: Creating documentation fetcher script...')

# Create the UV single-file Python script
fetcher_script = '''#!/usr/bin/env python3
# /// script
# requires-python = \">=3.8\"
# dependencies = [
#     \"requests>=2.25.0\",
#     \"beautifulsoup4>=4.9.0\", 
#     \"markdownify>=0.11.0\",
#     \"pyyaml>=6.0\",
#     \"urllib3>=1.26.0\"
# ]
# ///

import requests
import yaml
import re
import os
import time
from pathlib import Path
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
from markdownify import markdownify
import sys

def clean_filename(name):
    \"\"\"Clean filename for filesystem compatibility\"\"\"
    # Remove/replace problematic characters
    name = re.sub(r'[<>:\"/\\\\|?*]', '-', name)
    name = re.sub(r'[-_\\s]+', '-', name)  # Normalize separators
    name = name.strip('-').lower()
    return name[:100]  # Limit length

def extract_site_name(url):
    \"\"\"Extract site name from URL\"\"\"
    domain = urlparse(url).netloc
    # Remove common prefixes
    domain = re.sub(r'^(docs?\\.|api\\.|help\\.|support\\.)', '', domain)
    domain = domain.replace('www.', '')
    # Take first part before .com/.org etc
    return domain.split('.')[0]

def detect_doc_platform(soup, url):
    \"\"\"Detect documentation platform type\"\"\"
    html_str = str(soup).lower()
    
    if 'docusaurus' in html_str or 'data-theme=\"docusaurus\"' in html_str:
        return 'docusaurus'
    elif 'gitbook' in html_str or '.gitbook.' in url:
        return 'gitbook'
    elif 'vitepress' in html_str or '__VP_HASH_MAP__' in html_str:
        return 'vitepress'  
    elif 'nextra' in html_str:
        return 'nextra'
    elif 'github.io' in url or 'gitlab.io' in url:
        return 'github_pages'
    else:
        return 'generic'

def find_markdown_source(soup, url):
    \"\"\"Try to find GitHub/GitLab repository with markdown sources\"\"\"
    # Look for edit links
    edit_links = soup.find_all('a', href=re.compile(r'github\\.com.*\\.md'))
    if edit_links:
        edit_url = edit_links[0]['href']
        # Convert edit URL to raw URL
        if '/blob/' in edit_url:
            raw_url = edit_url.replace('/blob/', '/raw/')
            repo_base = '/'.join(raw_url.split('/')[:-1]) + '/'
            return repo_base
    
    # Look for repository links
    repo_links = soup.find_all('a', href=re.compile(r'github\\.com|gitlab\\.com'))
    if repo_links:
        for link in repo_links:
            href = link['href']
            if any(word in link.get_text().lower() for word in ['source', 'github', 'repository', 'repo']):
                # Try to construct docs path
                if 'github.com' in href:
                    return href.rstrip('/') + '/raw/main/docs/'
    
    return None

def parse_navigation_generic(soup, base_url):
    \"\"\"Generic navigation parser\"\"\"
    structure = {}
    
    # Try multiple navigation selectors
    nav_selectors = [
        'nav[role=\"navigation\"]',
        '.sidebar',
        '.navigation', 
        '.menu',
        '.toc',
        'aside',
        '[class*=\"sidebar\"]',
        '[class*=\"nav\"]'
    ]
    
    nav_element = None
    for selector in nav_selectors:
        nav_element = soup.select_one(selector)
        if nav_element:
            break
    
    if not nav_element:
        # Fallback to all links
        links = soup.find_all('a', href=True)[:50]  # Limit to reasonable number
        structure['main'] = []
        for link in links:
            href = link['href']
            if href.startswith(('http', '/')) and not href.startswith('#'):
                full_url = urljoin(base_url, href)
                title = link.get_text(strip=True) or 'Untitled'
                if title and len(title) < 100:  # Reasonable title length
                    structure['main'].append({
                        'title': title,
                        'url': full_url
                    })
        return structure
    
    # Parse hierarchical navigation
    current_section = 'main'
    structure[current_section] = []
    
    # Look for section headers and links
    for element in nav_element.find_all(['h1', 'h2', 'h3', 'h4', 'a', 'li']):
        if element.name in ['h1', 'h2', 'h3', 'h4']:
            # New section
            section_name = clean_filename(element.get_text(strip=True))
            if section_name:
                current_section = section_name
                structure[current_section] = []
        elif element.name == 'a' and element.get('href'):
            href = element['href']
            if not href.startswith('#'):  # Skip anchor links
                full_url = urljoin(base_url, href)
                title = element.get_text(strip=True)
                if title:
                    structure[current_section].append({
                        'title': title,
                        'url': full_url
                    })
    
    return structure

def fetch_and_convert_content(url, markdown_base=None):
    \"\"\"Fetch content and convert to markdown if needed\"\"\"
    try:
        # Try markdown source first if available
        if markdown_base and not url.endswith('.md'):
            # Try to construct markdown URL
            path = urlparse(url).path
            md_path = path.rstrip('/') + '.md'
            md_url = urljoin(markdown_base, md_path.lstrip('/'))
            
            try:
                md_response = requests.get(md_url, timeout=10)
                if md_response.status_code == 200 and 'text/plain' in md_response.headers.get('content-type', ''):
                    return md_response.text
            except:
                pass
        
        # Fetch HTML and convert
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Remove navigation, footer, etc.
        for element in soup.find_all(['nav', 'footer', 'header', 'aside']):
            element.decompose()
        for element in soup.find_all(class_=re.compile(r'(nav|sidebar|footer|header)')):
            element.decompose()
        
        # Find main content
        main_content = (soup.find('main') or 
                       soup.find('article') or
                       soup.find(class_=re.compile(r'(content|main|article)')) or
                       soup.find('div', class_=re.compile(r'markdown|prose|content')))
        
        if main_content:
            content_html = str(main_content)
        else:
            content_html = str(soup.find('body') or soup)
        
        # Convert to markdown
        markdown_content = markdownify(content_html, heading_style=\"ATX\")
        
        # Clean up the markdown
        markdown_content = re.sub(r'\\n\\s*\\n\\s*\\n', '\\n\\n', markdown_content)  # Remove excessive newlines
        markdown_content = markdown_content.strip()
        
        return markdown_content
        
    except Exception as e:
        print(f'Error fetching {url}: {e}')
        return None

def main():
    if len(sys.argv) != 3:
        print('Usage: script.py <root_url> <output_folder>')
        sys.exit(1)
    
    root_url = sys.argv[1]
    output_folder = sys.argv[2]
    
    print(f'Scraping documentation from: {root_url}')
    print(f'Output folder: {output_folder}')
    
    # Create output directory
    Path(output_folder).mkdir(parents=True, exist_ok=True)
    
    try:
        # Fetch main page
        print('\\nAnalyzing site structure...')
        response = requests.get(root_url, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Detect platform and markdown source
        platform = detect_doc_platform(soup, root_url)
        markdown_base = find_markdown_source(soup, root_url)
        site_name = extract_site_name(root_url)
        
        print(f'Detected platform: {platform}')
        if markdown_base:
            print(f'Found markdown source: {markdown_base}')
        
        # Parse navigation
        structure = parse_navigation_generic(soup, root_url)
        
        # Create YAML structure file
        yaml_structure = {f'{site_name}': {}}
        for section, items in structure.items():
            if items:  # Only include non-empty sections
                yaml_structure[site_name][section] = []
                for item in items[:20]:  # Limit items per section
                    yaml_structure[site_name][section].append(item['url'])
        
        # Write YAML structure
        yaml_filename = f'{site_name}-docs-structure.yaml'
        yaml_path = Path(output_folder) / yaml_filename
        
        with open(yaml_path, 'w') as f:
            f.write(f'# {site_name.title()} Documentation\\n')
            f.write('# Auto-generated docs tree with markdown links\\n\\n')
            yaml.dump(yaml_structure, f, default_flow_style=False, sort_keys=False)
        
        print(f'\\nCreated structure file: {yaml_path}')
        
        # Download all content
        print('\\nDownloading content...')
        total_files = 0
        
        for section, items in structure.items():
            if not items:
                continue
                
            print(f'\\nProcessing section: {section}')
            
            for i, item in enumerate(items[:20]):  # Limit per section
                url = item['url']
                title = item['title']
                
                # Generate filename
                filename_part = clean_filename(title)
                full_filename = f'{site_name}_{section}_{filename_part}.md'
                file_path = Path(output_folder) / full_filename
                
                print(f'  [{i+1:2d}] {title[:50]}...')
                
                # Fetch content
                content = fetch_and_convert_content(url, markdown_base)
                
                if content:
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(f'# {title}\\n\\n')
                        f.write(f'Source: {url}\\n\\n')
                        f.write(content)
                    total_files += 1
                
                # Be respectful - add delay
                time.sleep(0.5)
        
        print(f'\\nCompleted! Downloaded {total_files} files to {output_folder}/')
        print(f'Structure saved to: {yaml_path}')
        
    except Exception as e:
        print(f'Error: {e}')
        sys.exit(1)

if __name__ == '__main__':
    main()
'''

# Write the fetcher script
with open('docs_fetcher.py', 'w') as f:
    f.write(fetcher_script)

print('Created docs_fetcher.py')
print('Now running the scraper...')

# Update config for next step
config['step'] = 'fetch'
with open('scrape_config.json', 'w') as f:
    json.dump(config, f)
"```

### Step 3: Execute the Documentation Scraper

!```python docs_fetcher.py "$root_url" "$output_folder"```

### Step 4: Cleanup and Summary

!```python -c "
import json
import os
from pathlib import Path

# Load config
with open('scrape_config.json', 'r') as f:
    config = json.load(f)

output_folder = config['output_folder']
root_url = config['root_url']

print(f'\\n🎉 Documentation scraping completed!')
print(f'Source: {root_url}')
print(f'Output: {output_folder}/')

# Count files
if Path(output_folder).exists():
    md_files = list(Path(output_folder).glob('*.md'))
    yaml_files = list(Path(output_folder).glob('*.yaml'))
    
    print(f'\\nFiles created:')
    print(f'  📄 Markdown files: {len(md_files)}')
    print(f'  📋 Structure files: {len(yaml_files)}')
    
    if yaml_files:
        print(f'\\nStructure file: {yaml_files[0]}')
        
    print(f'\\nFile naming convention: [site]_[section]_[filename].md')

# Cleanup
try:
    os.remove('scrape_config.json')
    os.remove('docs_fetcher.py')
    print('\\nCleaned up temporary files.')
except:
    pass
"```

## Features

✅ **Smart Platform Detection**: Automatically identifies Docusaurus, GitBook, VitePress, and other platforms  
✅ **Markdown-First**: Prioritizes direct markdown sources when available  
✅ **Clean Structure**: Generates organized YAML structure files  
✅ **Respectful Crawling**: Includes delays and error handling  
✅ **Format Conversion**: HTML-to-markdown when raw markdown isn't available  
✅ **Organized Output**: `[site]_[section]_[filename].md` naming convention  

## Output Structure

After running the command, you'll get:
```
docs/
├── site-name-docs-structure.yaml    # Clean YAML structure
├── site-name_getting-started_introduction.md
├── site-name_getting-started_quickstart.md  
├── site-name_guides_basic-usage.md
└── site-name_api_reference.md
```

The YAML structure file will look like your browser-use example:
```yaml
# Site Documentation  
# Auto-generated docs tree with markdown links

site-name:
  getting-started:
    - https://docs.site.com/getting-started/introduction
    - https://docs.site.com/getting-started/quickstart
  guides:
    - https://docs.site.com/guides/basic-usage
    - https://docs.site.com/guides/advanced
```