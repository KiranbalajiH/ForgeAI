export function buildAnalysisPrompt(): string {
  return `
# Repository Analysis Task

Analyze the provided repository as a Senior Software Architect.

Your report must include the following sections:

## 1. Project Overview
- What problem does this repository solve?
- Who is the target audience?
- What is the primary purpose?

## 2. Technology Stack
- Programming language
- Framework
- Package manager
- Major libraries
- Development tools

## 3. Architecture Review
- Explain the architecture.
- Explain the module organization.
- Explain how components interact.
- Mention entry points.

## 4. Code Quality
Review:
- Folder structure
- Naming conventions
- Maintainability
- Readability
- Scalability

## 5. Best Practices
Mention:
- Good practices already followed
- Missing best practices
- Design improvements

## 6. Security Review
Look for:
- Hardcoded secrets
- Authentication concerns
- Authorization concerns
- Input validation
- Dependency risks

## 7. Performance Review
Identify:
- Expensive operations
- Possible bottlenecks
- Optimization opportunities

## 8. Improvement Suggestions
Provide practical recommendations ordered by priority.

Respond using Markdown.
`;
}