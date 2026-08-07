import {
  RepositoryKnowledgeService,
  RepositoryKnowledgeResult,
  KnowledgeRetrievalOptions,
  KnowledgeRetrievalStats,
} from "./repository-knowledge.service";
import { LLMService } from "./llm.service";
import { SourceReference, ContextDomain } from "./chat-context.service";
import { executeWithTelemetry } from "./ai-service.wrapper";
import { AIServiceBase } from "./ai-service.base";
import { AIConfigService } from "./ai-config.service";


export type ReviewType =
  | "General Review"
  | "Security Review"
  | "Performance Review"
  | "Maintainability Review"
  | "Best Practices Review"
  | string;

export type ReviewSeverity = "Low" | "Medium" | "High";

export interface ReviewFinding {
  /** Short title of the finding */
  title: string;
  /** Detailed description of the finding */
  description: string;
  /** Affected file path (if identifiable) */
  filePath?: string;
  /** Severity level */
  severity: ReviewSeverity;
  /** Actionable recommendation to address the finding */
  recommendation: string;
}

export interface CodeReviewResult {
  /** High-level summary of the code review */
  summary: string;
  /** Structured findings list parsed from LLM output (best-effort) */
  findings: ReviewFinding[];
  /** Actionable recommendations list */
  recommendations: string[];
  /** Overall severity of identified issues */
  overallSeverity: ReviewSeverity;
  /** Full raw markdown review text from the LLM */
  fullReview: string;
  /** Citable source references */
  sources: SourceReference[];
  /** Review metadata */
  metadata: {
    repository: string;
    reviewType: string;
    filePath?: string;
    intent: string;
    contextDomainsUsed: ContextDomain[];
    strategy: string;
  };
  /** Retrieval and generation statistics */
  stats: KnowledgeRetrievalStats;
}

interface ReviewTypeConfig {
  /** Targeted retrieval query for RepositoryKnowledgeService */
  buildRetrievalQuery: (filePath?: string) => string;
  /** Review-specific prompt builder */
  buildPrompt: (knowledgePrompt: string, repository: string, filePath?: string) => string;
}

/**
 * Extensible Review Type Configuration Map
 *
 * To add a new review type in the future:
 *  1. Add a new key matching the reviewType string
 *  2. Implement buildRetrievalQuery() — targeting specific context for this review
 *  3. Implement buildPrompt() — producing a review-focused LLM prompt
 */
const REVIEW_TYPE_CONFIGS: Record<string, ReviewTypeConfig> = {
  "General Review": {
    buildRetrievalQuery: (filePath) =>
      filePath
        ? `${filePath} code quality architecture patterns logic errors`
        : "code quality architecture logic patterns error handling services controllers",
    buildPrompt: (knowledgePrompt, repo, filePath) => `
You are a Senior Software Engineer conducting a thorough code review of the "${repo}" repository.
${filePath ? `Focus your review specifically on the file: \`${filePath}\`.` : "Conduct a repository-level high-level code review."}

## Review Criteria
- Code quality and readability
- Logic correctness and edge case handling
- Naming conventions and code organization
- Error handling completeness
- Code duplication and DRY principles
- Documentation and comments

## Output Format
Structure your review with:
### Summary
A concise paragraph summarizing the overall code quality.

### Findings
For each issue found:
- **[SEVERITY: Low|Medium|High]** Title
- Description of the issue
- File path if identifiable
- Recommendation to fix

### Recommendations
Numbered list of actionable improvements.

---

${knowledgePrompt}
`,
  },

  "Security Review": {
    buildRetrievalQuery: (filePath) =>
      filePath
        ? `${filePath} security authentication authorization validation input sanitization`
        : "security authentication jwt token validation middleware authorization input sanitization SQL injection CORS",
    buildPrompt: (knowledgePrompt, repo, filePath) => `
You are a Principal Security Engineer performing a security audit of the "${repo}" repository.
${filePath ? `Focus your security review on the file: \`${filePath}\`.` : "Conduct a repository-wide security audit."}

## Security Review Criteria
- Authentication and authorization flaws
- Input validation and sanitization gaps
- SQL/NoSQL injection vulnerabilities
- Sensitive data exposure (API keys, secrets in code)
- Insecure direct object references
- Missing rate limiting or brute force protection
- CORS misconfiguration
- JWT token handling and expiry

## Output Format
Structure your review with:
### Security Summary
Overall security posture assessment.

### Security Findings
For each vulnerability:
- **[SEVERITY: Low|Medium|High]** Vulnerability Title
- Description and potential exploit scenario
- File path if applicable
- Remediation recommendation

### Security Recommendations
Numbered list of priority security improvements.

---

${knowledgePrompt}
`,
  },

  "Performance Review": {
    buildRetrievalQuery: (filePath) =>
      filePath
        ? `${filePath} performance optimization loops queries caching async`
        : "performance optimization database queries N+1 caching async await loops inefficiency bottleneck",
    buildPrompt: (knowledgePrompt, repo, filePath) => `
You are a Performance Engineering Expert reviewing the "${repo}" repository for performance issues.
${filePath ? `Focus your review on the file: \`${filePath}\`.` : "Conduct a repository-level performance review."}

## Performance Review Criteria
- Database query efficiency and N+1 query problems
- Missing or inefficient caching strategies
- Blocking synchronous operations that should be async
- Unnecessary data fetching (over-fetching)
- Algorithm complexity and inefficient loops
- Memory leaks and resource management
- Missing pagination for large datasets

## Output Format
Structure your review with:
### Performance Summary
Overall performance assessment and key bottlenecks identified.

### Performance Findings
For each issue:
- **[SEVERITY: Low|Medium|High]** Issue Title
- Description of the performance impact
- File path if identifiable
- Optimization recommendation

### Performance Recommendations
Numbered list of performance improvements ordered by impact.

---

${knowledgePrompt}
`,
  },

  "Maintainability Review": {
    buildRetrievalQuery: (filePath) =>
      filePath
        ? `${filePath} maintainability complexity coupling modules dependencies`
        : "maintainability code complexity coupling cohesion module structure dependencies technical debt",
    buildPrompt: (knowledgePrompt, repo, filePath) => `
You are a Software Architect evaluating the maintainability of the "${repo}" repository.
${filePath ? `Focus your review on the file: \`${filePath}\`.` : "Conduct a repository-wide maintainability review."}

## Maintainability Review Criteria
- Module coupling and cohesion
- Cyclomatic complexity of functions
- Single Responsibility Principle violations
- Code duplication and abstraction opportunities
- Test coverage gaps
- Dependency management and circular dependencies
- Dead code and unused exports

## Output Format
Structure your review with:
### Maintainability Summary
Assessment of overall maintainability and technical debt level.

### Maintainability Findings
For each issue:
- **[SEVERITY: Low|Medium|High]** Issue Title
- Description of the maintainability concern
- File path if identifiable
- Refactoring recommendation

### Maintainability Recommendations
Numbered list of refactoring and structural improvements.

---

${knowledgePrompt}
`,
  },

  "Best Practices Review": {
    buildRetrievalQuery: (filePath) =>
      filePath
        ? `${filePath} best practices patterns conventions TypeScript architecture`
        : "best practices design patterns conventions TypeScript Node.js REST API architecture standards",
    buildPrompt: (knowledgePrompt, repo, filePath) => `
You are a Principal Engineer reviewing the "${repo}" repository for adherence to industry best practices.
${filePath ? `Focus your review on the file: \`${filePath}\`.` : "Conduct a repository-wide best practices review."}

## Best Practices Review Criteria
- Language and framework-specific conventions (TypeScript, Node.js, etc.)
- REST API design principles
- Separation of concerns and clean architecture
- Error handling patterns
- Logging and observability practices
- Configuration management and environment variables
- Type safety and TypeScript usage quality

## Output Format
Structure your review with:
### Best Practices Summary
Overall adherence to industry standards and identified gaps.

### Best Practices Findings
For each deviation:
- **[SEVERITY: Low|Medium|High]** Finding Title
- Description of the deviation from best practices
- File path if identifiable
- Best practice recommendation

### Best Practices Recommendations
Numbered list of improvements to align with industry standards.

---

${knowledgePrompt}
`,
  },
};

/** Normalize review type string to canonical key */
function normalizeReviewType(reviewType: string): string {
  if (!reviewType) return "General Review";
  const norm = reviewType.trim().toLowerCase().replace(/[-_]/g, " ");

  if (norm.includes("security")) return "Security Review";
  if (norm.includes("performance")) return "Performance Review";
  if (norm.includes("maintain")) return "Maintainability Review";
  if (norm.includes("best") || norm.includes("practice")) return "Best Practices Review";
  if (norm.includes("general")) return "General Review";

  return reviewType.trim();
}

/**
 * Extracts overall severity from the LLM review text.
 * Returns the highest severity found, or "Medium" as default.
 */
function extractOverallSeverity(reviewText: string): ReviewSeverity {
  const highCount = (reviewText.match(/SEVERITY:\s*High/gi) || []).length;
  const medCount = (reviewText.match(/SEVERITY:\s*Medium/gi) || []).length;
  if (highCount > 0) return "High";
  if (medCount > 0) return "Medium";
  return "Low";
}

/**
 * Best-effort extraction of recommendations list from review markdown.
 * Looks for numbered lines in a "Recommendations" section.
 */
function extractRecommendations(reviewText: string): string[] {
  const recs: string[] = [];
  const lines = reviewText.split("\n");
  let inRecsSection = false;
  for (const line of lines) {
    if (/^#+\s.*[Rr]ecommendation/.test(line)) {
      inRecsSection = true;
      continue;
    }
    if (inRecsSection && /^#+\s/.test(line)) {
      break;
    }
    if (inRecsSection) {
      const match = line.match(/^\s*\d+\.\s+(.+)/);
      if (match) {
        recs.push(match[1].trim());
      }
    }
  }
  return recs;
}

/**
 * CodeReviewService
 *
 * Responsibility:
 *  1. Accept repository, optional filePath, and reviewType.
 *  2. Build a targeted retrieval query based on reviewType and filePath.
 *  3. Delegate knowledge retrieval to RepositoryKnowledgeService.
 *  4. Build a review-specific structured prompt.
 *  5. Call LLMService and parse the response into a structured CodeReviewResult.
 */
export class CodeReviewService extends AIServiceBase {
  private knowledgeService: RepositoryKnowledgeService;
  private llmService: LLMService;

  constructor(
    knowledgeService?: RepositoryKnowledgeService,
    llmService?: LLMService,
    configService?: AIConfigService
  ) {
    super("CodeReviewService", configService);
    this.knowledgeService = knowledgeService ?? new RepositoryKnowledgeService(undefined, undefined, undefined, undefined, configService);
    this.llmService = llmService ?? new LLMService(undefined, configService);
  }

  /**
   * Perform an AI code review for a repository or specific file.
   *
   * @param repository - Repository slug / name
   * @param reviewType - Type of code review to perform
   * @param filePath   - Optional file path to focus the review
   * @param options    - Optional retrieval tuning parameters
   */
  async review(
    repository: string,
    reviewType: ReviewType,
    filePath?: string,
    options?: KnowledgeRetrievalOptions
  ): Promise<CodeReviewResult> {
    return this.execute(repository, async (context) => {
        const canonicalType = normalizeReviewType(reviewType);

    const config = REVIEW_TYPE_CONFIGS[canonicalType] ?? {
      buildRetrievalQuery: (fp?: string) =>
        fp ? `${fp} code review quality` : `${reviewType} code review repository quality`,
      buildPrompt: (knowledgePrompt: string, repo: string, fp?: string) => `
You are a Senior Software Engineer conducting a ${reviewType} review of the "${repo}" repository.
${fp ? `Focus on the file: \`${fp}\`.` : ""}

${knowledgePrompt}
`,
    };

    // 1. Build retrieval query (file-focused or repo-level)
    const retrievalQuery = config.buildRetrievalQuery(filePath);

    // 2. Retrieve targeted repository knowledge
    const knowledgeResult: RepositoryKnowledgeResult = this.knowledgeService.retrieve(
      repository,
      retrievalQuery,
      options
    );

    // 3. Build review-specific prompt
    const reviewPrompt = config.buildPrompt(
      knowledgeResult.prompt,
      repository,
      filePath
    );

    // 4. Call LLMService and format result
    const fullReview = await this.trackLLM(context, reviewPrompt, () =>
      this.llmService.chat(reviewPrompt)
    );

    // 5. Parse structured data from LLM output (best-effort)
    const overallSeverity = extractOverallSeverity(fullReview);
    const recommendations = extractRecommendations(fullReview);

    // Extract summary (first paragraph after "### Summary" or first 300 chars)
    const summaryMatch = fullReview.match(/###\s+[A-Za-z\s]*Summary\s*\n+([\s\S]+?)(?=\n###|\n##|$)/);
    const summary = summaryMatch
      ? summaryMatch[1].trim().slice(0, 600)
      : fullReview.slice(0, 300).trim();

    return {
      summary,
      findings: [],           // Structured parsing handled by future milestone; fullReview contains them
      recommendations,
      overallSeverity,
      fullReview,
      sources: knowledgeResult.sources,
      metadata: this.buildMetadata(repository, knowledgeResult, { reviewType: canonicalType, filePath }) as any,
      stats: knowledgeResult.stats,
    };
    }, {
      category: "AIResponses",
      payload: { filePath, reviewType, options },
    });
  }
}
