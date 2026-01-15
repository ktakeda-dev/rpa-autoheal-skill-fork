# Raw Idea: Deterministic YAML to JS Conversion for Browser Automation Workflows

## Feature Description

User wants to change how YAML to JS conversion works for browser automation workflows:

### Current State
- YAML to JS conversion is done by AI
- AI interprets YAML in various ways (like conditionals)

### Desired State
- YAML should follow a strict schema
- JS conversion should be done deterministically by a script (not AI)
- If YAML is correct, JS output should be deterministic
- Conditionals and other logic should be explicitly defined in YAML
- Should work both via MCP's browser_code and via run-workflow.js

## Date Initiated
2026-01-15
