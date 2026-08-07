import {
  ImpactAnalysisService,
  ImpactAnalysisResult,
  TargetType,
} from "./impact-analysis.service";
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

export type RiskLevel = "Low" | "Medium" | "High" | "Critical";

export interface ChangeRiskAssessmentResult {
  overallRisk: RiskLevel;
  riskFactors: string[];
  potentialBreakingChanges: string[];
  componentsLikelyAffected: string[];
  recommendedTestAreas: string[];
  rollbackConsiderations: string[];
  mitigationSuggestions: string[];
  confidenceScore: number;
  markdownReport: string;
  sources: SourceReference[];
  metadata: {
    repository: string;
    targetType: TargetType;
    targetIdentifier: string;
    changeDescription?: string;
    intent: string;
    contextDomainsUsed: ContextDomain[];
    strategy: string;
  };
  stats: KnowledgeRetrievalStats;
}

function normalizeTargetType(type: string): TargetType {
  const norm = type.trim().toLowerCase();
  if (norm.includes("file")) return "File";
  if (norm.includes("class")) return "Class";
  if (norm.includes("interface")) return "Interface";
  if (norm.includes("func")) return "Function";
  if (norm.includes("mod")) return "Module";
  return "File";
}

function extractOverallRisk(markdown: string, impactRiskLevel: string): RiskLevel {
  if (/Overall Risk:\s*Critical/i.test(markdown)) return "Critical";
  if (/Overall Risk:\s*High/i.test(markdown)) return "High";
  if (/Overall Risk:\s*Medium/i.test(markdown)) return "Medium";
  if (/Overall Risk:\s*Low/i.test(markdown)) return "Low";
  if (impactRiskLevel === "High") return "High";
  if (impactRiskLevel === "Medium") return "Medium";
  return "Low";
}

function extractConfidenceScore(markdown: string, retrievedChunksCount: number): number {
  const match = markdown.match(/Confidence Score:\s*(\d+)%/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  return retrievedChunksCount > 3 ? 85 : 50;
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
      const m = line.match(/^\s*[-*]\s+(.+)/) || line.match(/^\s*\d+\.\s+(.+)/);
      if (m) {
        items.push(m[1].trim());
      }
    }
  }
  return items;
}

export class ChangeRiskAssessmentService extends AIServiceBase {
  private impactService: ImpactAnalysisService;
  private knowledgeService: RepositoryKnowledgeService;
  private llmService: LLMService;

  constructor(
    impactService?: ImpactAnalysisService,
    knowledgeService?: RepositoryKnowledgeService,
    llmService?: LLMService,
    configService?: AIConfigService
  ) {
    super("ChangeRiskAssessmentService", configService);
    this.knowledgeService = knowledgeService ?? new RepositoryKnowledgeService(undefined, undefined, undefined, undefined, configService);
    this.impactService = impactService ?? new ImpactAnalysisService(undefined, this.knowledgeService, llmService, configService);
    this.llmService = llmService ?? new LLMService(undefined, configService);
  }

  async assess(
    repository: string,
    targetType: string,
    targetIdentifier: string,
    changeDescription?: string,
    options?: KnowledgeRetrievalOptions
  ): Promise<ChangeRiskAssessmentResult> {
    return this.execute(repository, async (context) => {
      const canonicalType = normalizeTargetType(targetType);

      const impactResult: ImpactAnalysisResult = await this.impactService.analyze(
        repository,
        targetType,
        targetIdentifier,
        options
      );

      let retrievalQuery = `risk assessment breaking changes tests for ${canonicalType} ${targetIdentifier}`;
      if (changeDescription) {
        retrievalQuery += ` considering proposed change: ${changeDescription}`;
      }

      const knowledgeResult: RepositoryKnowledgeResult = this.knowledgeService.retrieve(
        repository,
        retrievalQuery,
        options
      );

      const impactSummary = `
## Baseline Impact Analysis for ${targetIdentifier}
- **Impact Risk Level:** ${impactResult.riskLevel}
- **Breaking Change Likelihood:** ${impactResult.breakingChangeLikelihood}
- **Direct Dependencies:** ${impactResult.directDependencies.slice(0, 5).join(", ") || "None"}
- **Potentially Affected Modules:** ${impactResult.affectedModules.slice(0, 5).join(", ") || "None"}
`;

      const riskPrompt = [
        `You are a Lead Site Reliability Engineer and Senior Security Auditor evaluating the Change Risk for "${repository}".`,
        `Target Entity: **${targetIdentifier}** (${canonicalType})`,
        changeDescription ? `Proposed Change Description: "${changeDescription}"` : `Proposed Change: Refactoring / Modification of ${targetIdentifier}`,
        ``,
        `Your report MUST be structured with these exact Markdown headers:`,
        ``,
        `# Change Risk Assessment Report: ${targetIdentifier}`,
        ``,
        `## Executive Risk Summary`,
        `- **Overall Risk:** Critical | High | Medium | Low`,
        `- **Confidence Score:** 85%`,
        `Provide a brief narrative summarizing the risk profile of this proposed change.`,
        ``,
        `## Primary Risk Factors`,
        `List key factors contributing to the risk score (e.g., high coupling, lack of test coverage, breaking API change).`,
        ``,
        `## Potential Breaking Changes`,
        `List specific breaking change scenarios for callers or external integrations.`,
        ``,
        `## Components & Services Likely Affected`,
        `List specific components, services, or APIs that could experience regressions.`,
        ``,
        `## Recommended Test Areas`,
        `List critical test suites, integration paths, or smoke tests required before deployment.`,
        ``,
        `## Rollback & Deployment Considerations`,
        `List specific deployment rules, feature flags, DB migration rollbacks, or canary strategies.`,
        ``,
        `## Risk Mitigation Suggestions`,
        `List actionable steps to reduce the risk rating prior to merging.`,
        ``,
        `---`,
        ``,
        impactSummary,
        ``,
        `---`,
        ``,
        knowledgeResult.prompt,
      ].join("\n");

      const markdownReport = await this.trackLLM(context, riskPrompt, () =>
        this.llmService.chat(riskPrompt)
      );

      const overallRisk = extractOverallRisk(markdownReport, impactResult.riskLevel);
      const confidenceScore = extractConfidenceScore(markdownReport, knowledgeResult.sources.length);

      const riskFactors = extractSectionList(markdownReport, /^#+\s.*Primary Risk Factors/i);
      const potentialBreakingChanges = extractSectionList(markdownReport, /^#+\s.*Potential Breaking Changes/i);
      const componentsLikelyAffected = extractSectionList(markdownReport, /^#+\s.*Components/i);
      const recommendedTestAreas = extractSectionList(markdownReport, /^#+\s.*Recommended Test Areas/i);
      const rollbackConsiderations = extractSectionList(markdownReport, /^#+\s.*Rollback/i);
      const mitigationSuggestions = extractSectionList(markdownReport, /^#+\s.*Mitigation/i);

      const combinedSourcesMap = new Map<string, SourceReference>();
      impactResult.sources.forEach((s) => combinedSourcesMap.set(s.path, s));
      knowledgeResult.sources.forEach((s) => combinedSourcesMap.set(s.path, s));
      const sources = Array.from(combinedSourcesMap.values());

      return {
        overallRisk,
        riskFactors: riskFactors.length > 0 ? riskFactors : ["Modification to shared module interface", "Potential regression in dependent components"],
        potentialBreakingChanges: potentialBreakingChanges.length > 0 ? potentialBreakingChanges : ["Signature changes may break downstream callers"],
        componentsLikelyAffected: componentsLikelyAffected.length > 0 ? componentsLikelyAffected : impactResult.affectedModules,
        recommendedTestAreas: recommendedTestAreas.length > 0 ? recommendedTestAreas : [impactResult.testingScope],
        rollbackConsiderations: rollbackConsiderations.length > 0
          ? rollbackConsiderations
          : ["Verify feature flag toggles before release", "Ensure database migration backward compatibility"],
        mitigationSuggestions: mitigationSuggestions.length > 0
          ? mitigationSuggestions
          : ["Add unit test coverage for target entity", "Perform staging environment validation"],
        confidenceScore,
        markdownReport,
        sources,
        metadata: this.buildMetadata(repository, knowledgeResult, { targetType: canonicalType, targetIdentifier, changeDescription }) as any,
        stats: knowledgeResult.stats,
      };
    }, {
      category: "AIResponses",
      payload: { targetType, targetIdentifier, changeDescription, options },
    });
  }
}
