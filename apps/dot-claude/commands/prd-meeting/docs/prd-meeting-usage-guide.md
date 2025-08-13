# `/prd-meeting` Command Usage Guide

## Overview
The `/prd-meeting` command provides an interactive PRD (Product Requirements Document) creation experience with Claude Code. It guides you through a structured process to create comprehensive PRDs that include product definitions, technical specifications, and automated feature backlogs.

## Command Syntax
```
/prd-meeting <feature-description | @file-reference>
```

## Quick Start Examples

### Example 1: Feature Description Input
```
/prd-meeting Build a file upload widget that supports drag-and-drop, multiple file types, and progress indicators for a React application
```

### Example 2: File Reference Input
```
/prd-meeting @ai_docs/prds/my-existing-prd.md
```

### Example 3: Detailed Feature Description
```
/prd-meeting Create a real-time chat system with WebSocket connections, message persistence, user presence indicators, and emoji reactions for a collaborative workspace application
```

## Input Types and Best Practices

### Feature Description Input
When providing a feature description directly:

**Good Examples:**
- `Build a user dashboard with analytics widgets, customizable layouts, and data export functionality`
- `Implement a notification system with push notifications, email alerts, and in-app messaging`
- `Create a payment processing integration with Stripe, subscription management, and billing history`

**What Makes a Good Description:**
- Be specific about the main functionality
- Mention the target platform or technology if relevant
- Include key user-facing features
- Specify the problem it solves or user need it addresses

**Avoid:**
- Vague descriptions like "build a website" or "add some features"
- Overly technical implementation details
- Feature lists that are too narrow (use broader feature descriptions)

### File Reference Input
When referencing existing files:

**Supported File Types:**
- Existing PRD files (`.md`)
- Feature specifications
- User stories or requirements documents
- Architecture documents with feature descriptions

**File Reference Examples:**
```
/prd-meeting @docs/user-auth-requirements.md
/prd-meeting @planning/mobile-app-specs.md
/prd-meeting @ai_docs/prds/incomplete-prd.md
```

## Command Workflow Phases

### Phase 1: Initialization (Automatic)
- Claude analyzes your input
- For descriptions: Creates a kebab-case filename automatically
- For file references: Analyzes existing content and offers options

**What You'll See:**
```
I'm creating a PRD for: user-authentication-system.md
Starting Phase 1: Initialization...
```

**For Existing Files:**
```
I found an existing PRD at: @ai_docs/prds/user-auth.md
Analysis: Executive Summary ✓, Key Features ✓, Technical Specs ✗, Backlog ✗

Choose an option:
1. Continue from Technical Specs
2. Review and refine existing sections  
3. Start fresh with new file (preserves original)
```

### Phase 2: Product Definition (Collaborative)
Claude switches to PM mode and drafts:
- Executive Summary
- Key Features

**Your Role:**
- Review the drafted content
- Provide feedback and suggestions
- Collaborate until you're satisfied

**Example Interaction:**
```
=== DRAFT SECTIONS ===

## Executive Summary
The User Authentication System provides...

## Key Features  
- User registration with email verification
- Secure password-based login
- JWT-based session management
...

What do you think of these sections? Any changes or additions?
```

### Phase 3: Technical Specification (Collaborative)
Claude switches to Architect mode and asks for your input:

**You'll Be Asked About:**
- Preferred technology stack
- Architecture considerations
- Existing system constraints
- Performance requirements

**Example Questions:**
```
For the technical specifications, I need your input:

1. What's your preferred backend technology? (Node.js, Python/Django, Java/Spring, etc.)
2. What database do you prefer? (PostgreSQL, MySQL, MongoDB, etc.)  
3. Any existing architecture constraints I should consider?
4. Any specific security or performance requirements?
```

### Phase 4: Backlog Generation (Automated)
Claude automatically generates:
- Feature breakdown prioritized by dependencies
- Detailed task lists for each feature (max 5 tasks)
- Implementation order recommendations

**No User Input Required** - This phase runs automatically.

### Phase 5: Completion (Automatic)
Claude provides:
- File path reference
- Review instructions
- Context clearing guidance

## Common Workflows

### Workflow 1: New Feature from Scratch
1. Run `/prd-meeting <description>`
2. Collaborate on product sections (Executive Summary, Features)
3. Provide technical input when prompted
4. Review automated backlog
5. Clear context before implementation

### Workflow 2: Continuing Incomplete PRD
1. Run `/prd-meeting @path/to/incomplete-prd.md`
2. Choose "Continue from [next section]"
3. Complete remaining phases
4. Review final PRD

### Workflow 3: Refining Existing PRD
1. Run `/prd-meeting @path/to/existing-prd.md`
2. Choose "Review and refine existing sections"
3. Collaborate on improvements
4. Continue with incomplete sections if any

### Workflow 4: Starting Fresh with Reference
1. Run `/prd-meeting @path/to/reference-doc.md`
2. Choose "Start fresh with new file"
3. Use existing content as reference
4. Complete full PRD process

## Best Practices

### Before Starting
- **Be Specific**: Provide detailed feature descriptions rather than vague concepts
- **Know Your Context**: Consider existing systems and constraints
- **Have Tech Preferences Ready**: Think about your preferred stack beforehand

### During Collaboration
- **Be Honest**: If sections don't capture your vision, speak up
- **Think User-First**: Focus on user value in product sections
- **Consider Scale**: Think about future growth and technical scalability
- **Ask Questions**: If unclear about Claude's suggestions, ask for clarification

### After Completion
- **Review Thoroughly**: Check the generated PRD against your original vision
- **Clear Context**: Always clear context before starting implementation
- **Use as Living Document**: Update the PRD as requirements evolve

## Tips for Better Results

### Feature Descriptions
```
# Good
"Build a customer support ticketing system with automated routing, SLA tracking, and integration with email and chat channels for enterprise clients"

# Better  
"Create a comprehensive customer support platform that automates ticket routing based on priority and category, tracks SLA compliance with escalation rules, and integrates with existing email systems and live chat tools to provide unified customer service management for enterprise teams"
```

### Technical Input
- Be specific about existing technology constraints
- Mention team expertise and preferences
- Consider operational requirements (monitoring, deployment, etc.)
- Think about integration needs with existing systems

### Collaboration Tips
- Don't just approve sections - actively engage and improve them
- Ask "what if" questions about edge cases
- Consider different user types and use cases
- Think about maintenance and operational aspects

## Troubleshooting

### Common Issues and Solutions

#### "The generated PRD doesn't match my vision"
**Solution:** Be more specific in your initial description or provide more detailed feedback during collaboration phases.

#### "Claude created too many/few features in the backlog"
**Solution:** During the product definition phase, be explicit about scope. Mention if you want a minimal viable version or comprehensive feature set.

#### "Technical specs don't fit my existing architecture"  
**Solution:** Provide detailed technical constraints and existing system information during Phase 3.

#### "Tasks in the backlog are too high-level/too detailed"
**Solution:** This is automated, but you can edit the PRD after completion or restart with more specific technical requirements.

#### "File already exists" error
**Solution:** Use file reference syntax: `/prd-meeting @path/to/existing-file.md` to handle existing files properly.

#### "Missing required information in backlog"
**Solution:** The backlog generation considers the entire PRD. Ensure executive summary and technical specs are comprehensive.

### Error Messages and Fixes

**"Could not parse feature description"**
- Provide more detailed description
- Avoid extremely short or vague inputs
- Try rephrasing with specific functionality mentioned

**"File not found"**  
- Check file path is correct
- Use absolute paths or paths relative to project root
- Ensure file exists and is readable

**"Insufficient technical information"**
- Provide more detailed technical requirements
- Be specific about stack preferences and constraints
- Mention integration requirements and existing systems

## Advanced Usage

### Working with Large Features
For complex features, consider breaking them into multiple PRDs:
```
# Instead of one massive PRD
/prd-meeting Build a complete e-commerce platform with inventory, payments, shipping, and analytics

# Break into focused PRDs  
/prd-meeting Create a product catalog and inventory management system for e-commerce
/prd-meeting Build a payment processing and checkout flow for online store
/prd-meeting Implement shipping and order fulfillment system
```

### Iterative Refinement
1. Create initial PRD with broad strokes
2. Review and identify areas needing more detail
3. Create focused follow-up PRDs for complex subsystems
4. Use file references to build on previous work

### Team Collaboration
- Share PRD files with team members for review
- Use the generated backlogs for sprint planning
- Reference PRDs during implementation for scope questions
- Update PRDs as requirements evolve during development

## Integration with Development Workflow

### After PRD Completion
1. **Clear Context**: Always clear Claude's context before implementation
2. **Review with Team**: Share PRD with technical team for validation
3. **Break Down Further**: Use PRD backlog as starting point for detailed task creation
4. **Reference During Development**: Use PRD sections to resolve scope questions

### Using PRDs for Implementation
- Reference Executive Summary for user value focus
- Use Key Features for acceptance criteria
- Leverage Technical Specs for architecture decisions  
- Follow Backlog for implementation order

### Maintaining PRDs
- Update as requirements change
- Version control PRD files with your codebase
- Use PRDs for onboarding new team members
- Reference during retrospectives and planning sessions

---

**Remember**: The `/prd-meeting` command is designed to be collaborative and iterative. Don't hesitate to provide feedback and ask for changes during the process. The goal is to create a PRD that truly captures your vision and provides clear guidance for implementation.