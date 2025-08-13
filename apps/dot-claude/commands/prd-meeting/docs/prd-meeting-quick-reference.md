# `/prd-meeting` Quick Reference Guide

## Command Syntax
```bash
/prd-meeting <feature-description>           # Create new PRD from description
/prd-meeting @path/to/file.md               # Work with existing file
```

## 5-Phase Process Overview

| Phase | Type | Description | Your Role |
|-------|------|-------------|-----------|
| 1. Initialization | Automatic | File creation/analysis | None |
| 2. Product Definition | Collaborative | Executive Summary + Features | Review & Refine |
| 3. Technical Specs | Collaborative | Stack + Architecture + Notes | Provide Tech Input |
| 4. Backlog Generation | Automatic | Features + Tasks | None |
| 5. Completion | Automatic | File reference + instructions | Review |

## Quick Examples by Use Case

### Web Application Features
```bash
/prd-meeting Build a user dashboard with customizable widgets, real-time data, and export functionality
/prd-meeting Create a file upload system with drag-drop, progress tracking, and cloud storage integration
/prd-meeting Implement a notification center with real-time updates, filtering, and mark-as-read functionality
```

### Mobile App Features
```bash
/prd-meeting Design an offline-first note-taking app with sync, rich text editing, and cross-device access
/prd-meeting Build a location-based reminder system with geofencing and background notifications
/prd-meeting Create a social media sharing feature with image filters and multi-platform posting
```

### API/Backend Features
```bash
/prd-meeting Implement a rate limiting system with usage analytics and tier-based restrictions
/prd-meeting Build a webhook management system with retry logic and event filtering
/prd-meeting Create a caching layer with Redis, invalidation strategies, and performance monitoring
```

### E-commerce Features
```bash
/prd-meeting Build a product recommendation engine using collaborative filtering and purchase history
/prd-meeting Implement a shopping cart with persistence, guest checkout, and abandoned cart recovery
/prd-meeting Create an inventory management system with real-time updates and low-stock alerts
```

### Integration Features
```bash
/prd-meeting Build a Slack integration for project notifications with custom formatting and threading
/prd-meeting Implement a payment gateway integration with multiple providers and fraud detection
/prd-meeting Create a CRM sync system with bidirectional data flow and conflict resolution
```

## Common Collaboration Responses

### During Product Definition
```
# Good Responses
"Add mobile responsiveness to the key features"
"The executive summary should emphasize cost savings for small businesses"
"Include accessibility compliance in the features list"

# Avoid
"Looks good" (without specific feedback)
"Add more features" (be specific about which ones)
```

### During Technical Input
```
# Helpful Information
"We're using React/Node.js with PostgreSQL, deployed on AWS"
"Team has strong Python skills but limited DevOps experience"
"Must integrate with our existing Auth0 authentication"
"Need to handle 10k concurrent users with sub-100ms response times"

# Less Helpful
"Use whatever is best" (be specific about constraints)
"Modern tech stack" (specify technologies)
```

## File Naming Conventions

### Auto-Generated Names (from descriptions)
- `user-authentication-system.md`
- `file-upload-widget.md`
- `real-time-chat-system.md`
- `payment-processing-integration.md`

### Manual File References
```bash
/prd-meeting @ai_docs/prds/auth-system.md        # Continue existing PRD
/prd-meeting @docs/requirements.md               # Use as reference
/prd-meeting @planning/mobile-features.md        # Work with planning doc
```

## Common Technical Stacks by Domain

### Web Applications
```
Stack: React/Vue + Node.js/Python + PostgreSQL/MongoDB
Architecture: SPA with REST/GraphQL API
Deployment: AWS/Vercel + CDN
```

### Mobile Apps
```
Stack: React Native/Flutter + Firebase/Supabase
Architecture: Offline-first with sync
Deployment: App Store + Google Play
```

### Data/Analytics
```
Stack: Python + FastAPI + PostgreSQL + Redis
Architecture: ETL pipelines + REST API
Deployment: Docker + Kubernetes
```

### Microservices
```
Stack: Node.js/Go + Docker + PostgreSQL
Architecture: Event-driven + API Gateway
Deployment: Kubernetes + Service Mesh
```

## PRD Quality Checklist

### Executive Summary ✓
- [ ] Clearly states the problem being solved
- [ ] Identifies target users
- [ ] Explains the solution approach
- [ ] Mentions key benefits/value

### Key Features ✓
- [ ] 5-10 bullet points
- [ ] User-facing functionality
- [ ] Prioritized by importance
- [ ] Specific and measurable

### Technical Specs ✓
- [ ] **Stack:** Specific technologies listed
- [ ] **Architecture:** High-level system design
- [ ] **Notes:** Security, performance, scalability considerations

### Backlog ✓
- [ ] Features broken down logically
- [ ] Each feature has clear description
- [ ] Tasks are implementable (≤5 per feature)
- [ ] Dependencies and order considered

## Troubleshooting Quick Fixes

### "PRD is too generic"
→ Provide more specific feature description and domain context

### "Technical specs don't fit"
→ Give detailed technical constraints and existing system info

### "Tasks are wrong granularity"
→ Edit the PRD after generation to match your team's workflow

### "Missing important features"
→ Be more comprehensive in initial description or add during collaboration

### "File handling issues"
→ Use `@` prefix for file references, check paths are correct

## Integration with Development

### Sprint Planning
1. Use PRD features as epics
2. Break down tasks further if needed
3. Estimate based on task complexity
4. Reference technical specs for architecture decisions

### Implementation
1. Clear Claude context before coding
2. Reference executive summary for user value
3. Use technical specs for implementation guidance
4. Follow backlog order for dependencies

### Code Reviews
1. Check implementation matches PRD scope
2. Verify user value is delivered
3. Ensure technical specs are followed
4. Update PRD if requirements change

## Advanced Usage Patterns

### Multi-PRD Projects
```bash
# Create related PRDs that reference each other
/prd-meeting Build user authentication system for e-commerce platform
/prd-meeting Create product catalog system that integrates with user auth
/prd-meeting Implement shopping cart with authenticated user sessions
```

### Iterative Refinement
```bash
# Start broad, then get specific
/prd-meeting Build a customer support system
# Review output, then create focused follow-ups
/prd-meeting Create advanced ticketing workflow for the customer support system
/prd-meeting Add AI-powered response suggestions to support system
```

### Reference-Based Development
```bash
# Use existing docs as starting point
/prd-meeting @docs/user-research.md Build mobile app features based on this research
/prd-meeting @competitors/feature-analysis.md Create our version of this competitor feature
```

## Time Expectations

### Typical Session Duration
- **Simple Features:** 10-15 minutes
- **Complex Features:** 20-30 minutes
- **Collaborative Refinement:** 5-10 minutes per phase
- **Technical Input:** 5 minutes

### When to Take Longer
- Domain requires significant context
- Multiple stakeholders need alignment
- Technical architecture is complex
- Feature scope is unclear

### When to Move Faster
- Clear requirements and constraints
- Standard technology stack
- Well-understood problem domain
- Experienced team

---

**Pro Tip:** Keep this reference open during your first few `/prd-meeting` sessions to quickly find examples and best practices!