# `/prd-meeting` Troubleshooting Guide

## Common Scenarios and Solutions

### Scenario 1: "The PRD is too generic"

**Problem:** The generated PRD lacks specificity and doesn't capture the unique aspects of your feature.

**Symptoms:**
- Executive summary reads like a template
- Key features are too high-level
- Technical specs don't consider your specific requirements

**Solutions:**
1. **Provide More Context in Initial Description:**
   ```
   # Instead of:
   /prd-meeting Build a dashboard
   
   # Try:
   /prd-meeting Build an executive dashboard for SaaS metrics with real-time revenue tracking, customer churn analysis, and customizable KPI widgets for startup founders
   ```

2. **Be More Engaged During Collaboration:**
   ```
   # When Claude presents sections, don't just say "looks good"
   # Provide specific feedback:
   "The executive summary should emphasize real-time data - our users need instant insights to make quick business decisions. Also add that this is specifically for B2B SaaS companies."
   ```

3. **Provide Domain-Specific Details:**
   - Mention your industry or use case
   - Specify user types and their unique needs
   - Include regulatory or compliance requirements
   - Reference existing tools or competitors

### Scenario 2: "The technical specs don't fit our architecture"

**Problem:** Generated technical specifications conflict with existing systems or team expertise.

**Symptoms:**
- Suggests technologies your team doesn't use
- Architecture doesn't integrate with existing systems
- Ignores performance or security constraints

**Solutions:**
1. **Provide Detailed Technical Context:**
   ```
   When Claude asks for technical input, be specific:
   
   "We're using a Django backend with PostgreSQL, deployed on AWS ECS. We need to integrate with our existing Redis cache and Elasticsearch cluster. Team has Python expertise but limited JavaScript knowledge. Must comply with SOC 2 requirements."
   ```

2. **Mention Existing Systems:**
   ```
   "This needs to integrate with our existing user authentication service (Auth0) and our current API gateway. We're using GraphQL for APIs and have a microservices architecture."
   ```

3. **Specify Constraints:**
   ```
   "Budget constraints mean we need to use existing AWS services. No new database engines. Must work with our current CI/CD pipeline (GitHub Actions)."
   ```

### Scenario 3: "The backlog is too detailed/not detailed enough"

**Problem:** Automatically generated tasks don't match your preferred level of granularity.

**Symptoms:**
- Tasks are too high-level for your team
- Tasks are too granular and micromanage-y
- Missing important considerations (testing, documentation, etc.)

**Solutions:**
1. **Edit the PRD After Generation:**
   The backlog is meant as a starting point. After completion, you can:
   - Break down large tasks into smaller ones
   - Combine small tasks into larger features
   - Add missing tasks for testing, documentation, monitoring
   - Reorganize based on your team's workflow

2. **Provide Better Product Context:**
   ```
   During product definition, mention:
   "This is for a small startup team of 3 developers"
   OR
   "This is for an enterprise team with dedicated QA and DevOps"
   ```

3. **Be Specific About Implementation Approach:**
   ```
   During technical specs, mention:
   "We follow TDD practices and need comprehensive test coverage"
   "We use feature flags for gradual rollouts"
   "We require detailed documentation for compliance"
   ```

### Scenario 4: "I want to restart/modify an existing PRD"

**Problem:** You want to change direction on an existing PRD or start over with different assumptions.

**Solutions:**
1. **Start Fresh with Preserved Original:**
   ```
   /prd-meeting @ai_docs/prds/existing-prd.md
   # Choose option 3: "Start fresh with new file"
   # This creates existing-prd-v2.md while preserving the original
   ```

2. **Continue and Modify Specific Sections:**
   ```
   /prd-meeting @ai_docs/prds/existing-prd.md  
   # Choose option 2: "Review and refine existing sections"
   # Collaborate to update specific sections
   ```

3. **Use as Reference for New PRD:**
   ```
   # Read the existing PRD first, then create new one
   /prd-meeting Create an improved version of the user authentication system with enhanced security features and better mobile support
   ```

### Scenario 5: "Claude is not understanding my domain"

**Problem:** Claude lacks context about your specific industry, technology, or business domain.

**Symptoms:**
- Suggests inappropriate features for your industry
- Misunderstands regulatory requirements
- Uses wrong terminology or concepts

**Solutions:**
1. **Provide Domain Education:**
   ```
   During collaboration, educate Claude:
   "In healthcare, we need HIPAA compliance which means all patient data must be encrypted at rest and in transit. We also need audit logs for all data access."
   ```

2. **Reference Industry Standards:**
   ```
   "This is for fintech, so we need to follow PCI DSS standards and integrate with banking APIs like Plaid. KYC and AML compliance are essential."
   ```

3. **Explain Your User Base:**
   ```
   "Our users are construction project managers who work on mobile devices in harsh environments. They need offline functionality and simple, large-button interfaces."
   ```

### Scenario 6: "The process is taking too long"

**Problem:** The collaborative phases are taking longer than expected.

**Solutions:**
1. **Prepare in Advance:**
   - Have your technology preferences ready
   - Know your constraints and requirements
   - Prepare examples of similar features you like

2. **Use Quick Approval:**
   ```
   If sections look good:
   "These sections look great, let's move to technical specs"
   
   Instead of extensive back-and-forth refinement
   ```

3. **Focus on Critical Elements:**
   ```
   "Let's focus on getting the core functionality right. We can iterate on nice-to-have features later."
   ```

## Error Messages and Resolutions

### "Could not determine appropriate filename"
**Cause:** Feature description is too vague or unclear.
**Solution:** Provide a more specific description with the main feature name clearly stated.

### "Failed to write to file [filename]"
**Cause:** File permissions or path issues.
**Solution:** 
- Check that the target directory exists
- Ensure you have write permissions
- Try a different filename or location

### "Unable to parse existing PRD structure"
**Cause:** Existing file doesn't follow expected PRD format.
**Solution:**
- Use "Start fresh" option instead of continuing
- Manually format the existing file to match PRD structure
- Provide the content as a description instead of file reference

### "Insufficient context for technical specifications"
**Cause:** Not enough technical information provided during collaboration.
**Solution:**
- Provide more detailed technical requirements
- Mention existing systems and constraints
- Be specific about team expertise and preferences

## Performance and Quality Tips

### Getting Better PRDs
1. **Invest Time in Product Definition:**
   - The better your executive summary and features, the better the technical specs and backlog
   - Don't rush through collaborative phases

2. **Think About Edge Cases:**
   ```
   During collaboration, ask:
   "What about error handling?"
   "How do we handle high traffic?"
   "What about accessibility requirements?"
   ```

3. **Consider the Full Lifecycle:**
   ```
   "Don't forget about monitoring and observability"
   "We need deployment and rollback strategies"
   "Include maintenance and support considerations"
   ```

### Optimizing the Process
1. **Batch Similar Features:**
   If you have multiple related features, create separate PRDs but reference each other:
   ```
   "This payment system PRD should integrate with the user authentication PRD we created earlier"
   ```

2. **Use Iterative Approach:**
   - Start with core features
   - Create follow-up PRDs for advanced features
   - Reference previous PRDs for consistency

3. **Maintain Context Files:**
   Keep a project context file that you can reference:
   ```
   /prd-meeting @docs/project-context.md Build a notification system for our existing e-commerce platform
   ```

## Integration Issues

### Problem: PRD Doesn't Align with Existing Codebase
**Solutions:**
- Provide architecture documentation as reference
- Mention existing patterns and conventions
- Specify integration points and dependencies

### Problem: Generated Tasks Don't Match Team Workflow
**Solutions:**
- Customize the backlog after generation
- Add team-specific processes (code review, testing, deployment)
- Align task granularity with sprint planning approach

### Problem: Missing Non-Functional Requirements
**Solutions:**
- Explicitly mention performance, security, accessibility needs
- Include operational requirements (monitoring, logging)
- Specify compliance and regulatory requirements

## Best Practices for Avoiding Issues

### Before Starting
- [ ] Know your target users and their specific needs
- [ ] Understand technical constraints and existing systems
- [ ] Have clear success criteria in mind
- [ ] Prepare domain-specific context

### During Collaboration
- [ ] Read all generated content carefully
- [ ] Ask questions if anything is unclear
- [ ] Provide specific, actionable feedback
- [ ] Think about edge cases and non-functional requirements

### After Completion
- [ ] Review the entire PRD for consistency
- [ ] Validate technical approach with your team
- [ ] Customize the backlog for your workflow
- [ ] Clear context before starting implementation

### Long-term Maintenance
- [ ] Version control your PRDs
- [ ] Update PRDs as requirements evolve
- [ ] Use PRDs for team onboarding
- [ ] Reference PRDs during retrospectives

## When to Skip `/prd-meeting`

The command is designed for comprehensive features, but may be overkill for:

**Too Simple:**
- Single API endpoint additions
- Minor UI tweaks or bug fixes
- Configuration changes
- Simple integrations

**Too Complex:**
- Multi-year platform initiatives
- Features requiring extensive research
- Features with unknown technical feasibility

**Alternative Approaches:**
- **Simple Features:** Use regular Claude Code conversation
- **Complex Initiatives:** Break into multiple focused PRDs
- **Research-Heavy:** Do discovery first, then create PRD

## Getting Help

If you continue having issues:
1. Check the usage guide for examples
2. Review the example PRD output for format reference
3. Start with simpler features to understand the process
4. Consider breaking complex features into smaller PRDs

Remember: The `/prd-meeting` command is a tool to facilitate better product planning. If it's not serving your needs, adapt the output or use alternative approaches that work better for your team and workflow.