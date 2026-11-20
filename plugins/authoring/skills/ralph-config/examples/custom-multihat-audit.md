# Example: Custom Multi-Hat Coordinator-Specialist

**Invocation:**
```bash
/ralph-config --pattern coordinator-specialist --from "Audit our API endpoints for OWASP Top 10 vulnerabilities"
```

## Generated PROMPT.md

```markdown
# Security audit: OWASP Top 10 vulnerability assessment

## Context
Comprehensive security review of all API endpoints against the
OWASP Top 10 (2021) vulnerability categories.

## Requirements
- Catalog all API endpoints
- Check each against OWASP Top 10 categories
- Produce a findings report with severity ratings
- Recommend remediation for each finding

### Acceptance Criteria
- [ ] All API endpoints are cataloged
- [ ] Each endpoint checked against all 10 OWASP categories
- [ ] Findings include severity (Critical/High/Medium/Low/Info)
- [ ] Remediation recommendations are actionable
- [ ] Final report is written to ./security-audit-report.md

## Out of Scope
- Implementing fixes (separate tickets per finding)
- Penetration testing
- Infrastructure/network security
```

## Generated ralph.yml

```yaml
event_loop:
  prompt_file: "PROMPT.md"
  completion_promise: "LOOP_COMPLETE"
  starting_event: "audit.start"
  max_iterations: 60
  max_runtime_seconds: 7200

cli:
  backend: "claude"

core:
  guardrails:
    - "Do NOT modify any code - this is analysis only"
    - "Document all findings with evidence"
    - "Rate severity objectively using CVSS guidelines"

hats:
  coordinator:
    name: "Audit Coordinator"
    description: "Plans the audit and synthesizes specialist findings into final report."
    triggers: ["audit.start", "*.findings"]
    publishes: ["analyze.endpoints", "audit.complete"]
    instructions: |
      ## COORDINATOR MODE
      1. On audit.start: catalog all API endpoints, plan analysis
      2. On *.findings: collect and synthesize specialist output
      3. When all analysis complete: write final report, output LOOP_COMPLETE

  analyzer:
    name: "Security Analyzer"
    description: "Analyzes endpoints against OWASP categories."
    triggers: ["analyze.endpoints"]
    publishes: ["security.findings"]
    default_publishes: "security.findings"
    instructions: |
      ## ANALYZER MODE
      For each endpoint, check against OWASP Top 10:
      A01 Broken Access Control, A02 Cryptographic Failures,
      A03 Injection, A04 Insecure Design, A05 Security Misconfiguration,
      A06 Vulnerable Components, A07 Auth Failures,
      A08 Data Integrity, A09 Logging Failures, A10 SSRF.
      Document findings with code references and severity.
```

**Event flow:** `audit.start → Coordinator → analyze.endpoints → Analyzer → security.findings → Coordinator → audit.complete → LOOP_COMPLETE`
