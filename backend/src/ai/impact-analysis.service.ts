import {
  RepositoryKnowledgeService,
  RepositoryKnowledgeResult,
  KnowledgeRetrievalOptions,
  KnowledgeRetrievalStats,
} from "./repository-knowledge.service";
import { WorkspaceAnalysisService, WorkspaceAnalysis } from "./workspace-analysis.service";
import { LLMService } from "./llm.service";
import { SourceReference, ContextDomain } from "./chat-context.service";
import { executeWithTelemetry } from "./ai-service.wrapper";
import { AIServiceBase } from "./ai-service.base";
import { AIConfigService } from "./ai-config.service";

export type TargetType =
  | "File"
  | "Class"
  | "Interface"
  | "Function"
  | "Module"
  | string;

export type ImpactRiskLevel = "Low" | "Medium" | "High";
export type BreakingLikelihood = "Low" | "Medium" | "High";

export interface ImpactAnalysisResult {
  directDependencies: string[];
  indirectDependencies: string[];
  affectedModules: string[];
  riskLevel: ImpactRiskLevel;
  testingScope: string;
  breakingChangeLikelihood: BreakingLikelihood;
  recommendedValidationSteps: string[];
  markdownReport: string;
  sources: SourceReference[];
  metadata: {
    repository: string;
    targetType: string;
    targetIdentifier: string;
    intent: string;
    contextDomainsUsed: ContextDomain[];
    strategy: string;
  };
  stats: KnowledgeRetrievalStats;
}

interface TargetTypeConfig {
  buildRetrievalQuery: (targetIdentifier: string) => string;
  buildPrompt: (
    workspaceSummary: string,
    knowledgePrompt: string,
    repository: string,
    targetType: string,
    targetIdentifier: string
  ) => string;
}

const TARGET_TYPE_CONFIGS: Record<string, TargetTypeConfig> = {
  File: {
    buildRetrievalQuery: (identifier) =>
      `${identifier} imports exports callers references dependencies module relationships file`,
    buildPrompt: (workspaceSummary, knowledgePrompt, repo, targetType, identifier) => `
You are a Principal Software Engineer analyzing the impact of modifying or refactoring a file in "${repo}".

Target File: \`${identifier}\`

${workspaceSummary}

## Objective
Perform a rigorous code impact analysis. Identify all direct and indirect dependencies, callers, affected modules, breaking change risks, and testing requirements if \`${identifier}\` is modified.

---

${knowledgePrompt}
`,
  },
  Class: {
    buildRetrievalQuery: (identifier) =>
      `${identifier} class instantiation methods usages references extends implements callers dependencies`,
    buildPrompt: (workspaceSummary, knowledgePrompt, repo, targetType, identifier) => `
You are a Lead Software Architect analyzing the impact of modifying a class in "${repo}".

Target Class: \`${identifier}\`

${workspaceSummary}

## Objective
Analyze the impact of modifying the class \`${identifier}\`. Evaluate inherited interfaces, subclass dependencies, dependency injection callers, and breaking changes to consumers.

---

${knowledgePrompt}
`,
  },
  Interface: {
    buildRetrievalQuery: (identifier) =>
      `${identifier} interface implements type usages parameters return types contracts references`,
    buildPrompt: (workspaceSummary, knowledgePrompt, repo, targetType, identifier) => `
You are a Senior TypeScript Architect analyzing the impact of modifying an interface or type contract in "${repo}".

Target Interface: \`${identifier}\`

${workspaceSummary}

## Objective
Analyze the contract impact of changing the interface \`${identifier}\`. Identify all implementing classes, function parameters, payload schemas, and API breaking risk.

---

${knowledgePrompt}
`,
  },
  Function: {
    buildRetrievalQuery: (identifier) =>
      `${identifier} function call calls callers callers usages parameters return async helper`,
    buildPrompt: (workspaceSummary, knowledgePrompt, repo, targetType, identifier) => `
You are a Senior Developer evaluating the blast radius of modifying a function in "${repo}".

Target Function: \`${identifier}\`

${workspaceSummary}

## Objective
Analyze the impact of modifying or signature-changing the function \`${identifier}\`. Track caller chains, direct/indirect dependencies, and potential side effects.

---

${knowledgePrompt}
`,
  },
  Module: {
    buildRetrievalQuery: (identifier) =>
      `${identifier} module package services controllers routes exported symbols dependencies relationships`,
    buildPrompt: (workspaceSummary, knowledgePrompt, repo, targetType, identifier) => `
You are a System Architect evaluating the system-wide impact of modifying a major module in "${repo}".

Target Module: \`${identifier}\`

${workspaceSummary}

## Objective
Analyze the high-level impact of modifying the module \`${identifier}\`. Identify dependent modules, API boundary impacts, cross-module communication risks, and regression testing scope.

---

${knowledgePrompt}
`,
  },
};

function normalizeTargetType(targetType: string): string {
  if (!targetType) return "File";
  const norm = targetType.trim().toLowerCase().replace(/[-_]/g, " ");

  if (norm.includes("file")) return "File";
  if (norm.includes("class")) return "Class";
  if (norm.includes("interface") || norm.includes("type")) return "Interface";
  if (norm.includes("func") || norm.includes("method")) return "Function";
  if (norm.includes("mod") || norm.includes("package")) return "Module";

  return targetType.trim();
}

function extractRiskLevel(markdown: string): ImpactRiskLevel {
  if (/Risk\s*Level:\s*High/i.test(markdown) || (markdown.match(/HIGH\s*RISK/gi) || []).length > 0) {
    return "High";
  }
  if (/Risk\s*Level:\s*Low/i.test(markdown)) {
    return "Low";
  }
  return "Medium";
}

function extractBreakingLikelihood(markdown: string): BreakingLikelihood {
  if (/Breaking\s*Change\s*Likelihood:\s*High/i.test(markdown) || /BREAKING\s*CHANGE/i.test(markdown)) {
    return "High";
  }
  if (/Breaking\s*Change\s*Likelihood:\s*Low/i.test(markdown)) {
    return "Low";
  }
  return "Medium";
}

function extractSectionList(markdown: string, headerRegex: RegExp): string[] {
  const items: string[] = [];
  const lines = markdown.split("\n");
  let inSection = false;

  for (const line of lines) {
    if (headerRegex.test(line)) {
      inSection = true;
      continue;
    }
    if (inSection && /^#+\s/.test(line)) {
      break;
    }
    if (inSection) {
      const match = line.match(/^\s*[-*]\s+(.+)/) || line.match(/^\s*\d+\.\s+(.+)/);
      if (match) {
        items.push(match[1].trim());
      }
    }
  }
  return items;
}

export class ImpactAnalysisService extends AIServiceBase {
  private workspaceService: WorkspaceAnalysisService;
  private knowledgeService: RepositoryKnowledgeService;
  private llmService: LLMService;

  constructor(
    workspaceService?: WorkspaceAnalysisService,
    knowledgeService?: RepositoryKnowledgeService,
    llmService?: LLMService,
    configService?: AIConfigService
  ) {
    super("ImpactAnalysisService", configService);
    this.knowledgeService = knowledgeService ?? new RepositoryKnowledgeService(undefined, undefined, undefined, undefined, configService);
    this.workspaceService = workspaceService ?? new WorkspaceAnalysisService(this.knowledgeService, undefined, llmService, configService);
    this.llmService = llmService ?? new LLMService(undefined, configService);
  }

  async analyze(
    repository: string,
    targetType: TargetType,
    targetIdentifier: string,
    options?: KnowledgeRetrievalOptions
  ): Promise<ImpactAnalysisResult> {
    return this.execute(repository, async (context) => {
      const canonicalType = normalizeTargetType(targetType);

      const workspaceAnalysis: WorkspaceAnalysis = await this.workspaceService.analyze(
        repository,
        options
      );

      const config = TARGET_TYPE_CONFIGS[canonicalType] ?? {
        buildRetrievalQuery: (id: string) => `${id} dependencies callers usage references module`,
        buildPrompt: (ws, kp, repo, tt, id) => `
You are a Senior Engineer conducting an Impact Analysis for modifying "${id}" (${tt}) in "${repo}".

${ws}

---

${kp}
`,
      };

      const retrievalQuery = config.buildRetrievalQuery(targetIdentifier);
      const knowledgeResult: RepositoryKnowledgeResult = this.knowledgeService.retrieve(
        repository,
        retrievalQuery,
        options
      );

      const workspaceSummary = `
## Repository Baseline Health
- **Repository:** ${workspaceAnalysis.repository}
- **Language/Framework:** ${workspaceAnalysis.technologies.language} (${workspaceAnalysis.technologies.framework})
- **Total Files:** ${workspaceAnalysis.totalFiles}
- **Estimated Complexity:** ${workspaceAnalysis.estimatedComplexity}
- **Major Modules:** ${workspaceAnalysis.majorModules.join(", ") || "None"}
`;

      const impactPrompt = [
        `You are a Principal Software Engineer performing a Change Impact & Blast Radius Analysis for "${repository}".`,
        `Target Entity: **${targetIdentifier}** (${canonicalType})`,
        ``,
        `Your report MUST be structured with these exact Markdown headers:`,
        ``,
        `# Impact Analysis Report: ${targetIdentifier}`,
        ``,
        `## Executive Summary`,
        `Provide a brief overview of the modification impact and overall blast radius.`,
        ``,
        `## Risk & Impact Assessment`,
        `- **Risk Level:** High | Medium | Low`,
        `- **Breaking Change Likelihood:** High | Medium | Low`,
        `- **Estimated Testing Scope:** Unit | Integration | End-to-End | Full Regression`,
        ``,
        `## Direct Dependencies`,
        `List direct imports, exports, callers, or components directly tied to ${targetIdentifier}.`,
        ``,
        `## Indirect & Transitive Dependencies`,
        `List indirect downstream callers, consumers, or secondary components affected.`,
        ``,
        `## Potentially Affected Modules`,
        `List functional modules that might experience regressions.`,
        ``,
        `## Recommended Validation & Testing Steps`,
        `Numbered list of specific tests and verification steps to execute.`,
        ``,
        `---`,
        ``,
        workspaceSummary,
        ``,
        `---`,
        ``,
        knowledgeResult.prompt,
      ].join("\n");

      const markdownReport = await this.trackLLM(context, impactPrompt, () =>
        this.llmService.chat(impactPrompt)
      );

      const riskLevel = extractRiskLevel(markdownReport);
      const breakingChangeLikelihood = extractBreakingLikelihood(markdownReport);
      const directDependencies = extractSectionList(markdownReport, /^#+\s.*Direct Dependencies/i);
      const indirectDependencies = extractSectionList(markdownReport, /^#+\s.*Indirect/i);
      const affectedModules = extractSectionList(markdownReport, /^#+\s.*Affected Modules/i);
      const recommendedValidationSteps = extractSectionList(markdownReport, /^#+\s.*Recommended Validation/i);

      const scopeMatch = markdownReport.match(/Estimated Testing Scope:\s*(.+)/i);
      const testingScope = scopeMatch ? scopeMatch[1].trim() : "Integration & Regression Testing";

      return {
        directDependencies,
        indirectDependencies,
        affectedModules: affectedModules.length > 0 ? affectedModules : workspaceAnalysis.majorModules,
        riskLevel,
        testingScope,
        breakingChangeLikelihood,
        recommendedValidationSteps: recommendedValidationSteps.length > 0
          ? recommendedValidationSteps
          : ["Run existing unit test suite", "Verify integration endpoints", "Perform manual sanity check"],
        markdownReport,
        sources: knowledgeResult.sources,
        metadata: this.buildMetadata(repository, knowledgeResult, { targetType: canonicalType, targetIdentifier }) as any,
        stats: knowledgeResult.stats,
      };
    }, {
      category: "AIResponses",
      payload: { targetType, targetIdentifier, options },
    });
  }
}
