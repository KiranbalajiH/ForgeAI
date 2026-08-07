import {
  WorkspaceAnalysisService,
  WorkspaceAnalysis,
} from "./workspace-analysis.service";
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

export type TaskScope = "Repository" | "Module" | "File" | string;
export type TaskComplexity = "Trivial" | "Low" | "Medium" | "High" | "Very High";

export interface TaskImplementationStep {
  order: number;
  title: string;
  description: string;
  files?: string[];
}

export interface AITaskPlanResult {
  executiveSummary: string;
  objectives: string[];
  filesLikelyToChange: string[];
  dependencies: string[];
  implementationSteps: TaskImplementationStep[];
  risks: string[];
  testingStrategy: string[];
  estimatedComplexity: TaskComplexity;
  estimatedDevelopmentTime: string;
  markdownPlan: string;
  sources: SourceReference[];
  metadata: {
    repository: string;
    taskDescription: string;
    scope: string;
    intent: string;
    contextDomainsUsed: ContextDomain[];
    strategy: string;
  };
  stats: KnowledgeRetrievalStats;
}

function normalizeScope(scope?: string): TaskScope {
  if (!scope) return "Repository";
  const norm = scope.trim().toLowerCase();
  if (norm.includes("mod")) return "Module";
  if (norm.includes("file")) return "File";
  return "Repository";
}

function extractComplexity(markdown: string, workspaceComplexity: string): TaskComplexity {
  if (/Estimated Complexity:\s*Very High/i.test(markdown)) return "Very High";
  if (/Estimated Complexity:\s*High/i.test(markdown)) return "High";
  if (/Estimated Complexity:\s*Medium/i.test(markdown)) return "Medium";
  if (/Estimated Complexity:\s*Low/i.test(markdown)) return "Low";
  if (/Estimated Complexity:\s*Trivial/i.test(markdown)) return "Trivial";
  if (workspaceComplexity === "Very High") return "High";
  if (workspaceComplexity === "High") return "Medium";
  return "Medium";
}

function extractDevTime(markdown: string): string {
  const match = markdown.match(/Estimated Development Time:\s*(.+)/i);
  return match ? match[1].trim() : "2–5 days";
}

function extractSectionList(markdown: string, headerRegex: RegExp): string[] {
  const items: string[] = [];
  const lines = markdown.split("\n");
  let inSection = false;
  for (const line of lines) {
    if (headerRegex.test(line)) { inSection = true; continue; }
    if (inSection && /^#+\s/.test(line)) break;
    if (inSection) {
      const m = line.match(/^\s*[-*]\s+(.+)/) || line.match(/^\s*\d+\.\s+(.+)/);
      if (m) items.push(m[1].trim());
    }
  }
  return items;
}

function extractImplementationSteps(markdown: string): TaskImplementationStep[] {
  const steps: TaskImplementationStep[] = [];
  const lines = markdown.split("\n");
  let inSteps = false;
  let currentStep: Partial<TaskImplementationStep> | null = null;
  for (const line of lines) {
    if (/^#+\s.*Implementation (Plan|Steps)/i.test(line)) { inSteps = true; continue; }
    if (inSteps && /^##\s/.test(line) && !/Implementation/i.test(line)) break;
    if (inSteps) {
      const headerMatch = line.match(/^###\s+(\d+)[.)]\s+(.+)/) || line.match(/^\*\*(\d+)[.)\*]\*?\*?\s+(.+)/);
      if (headerMatch) {
        if (currentStep?.title) steps.push(currentStep as TaskImplementationStep);
        currentStep = {
          order: parseInt(headerMatch[1], 10),
          title: headerMatch[2].trim(),
          description: "",
          files: [],
        };
        continue;
      }
      if (currentStep && line.trim()) {
        const fileLine = line.match(/^\s*[-*]\s+`(.+)`/);
        if (fileLine) {
          currentStep.files = currentStep.files ?? [];
          currentStep.files.push(fileLine[1].trim());
        } else if (!line.startsWith("#")) {
          currentStep.description = ((currentStep.description ?? "") + " " + line.trim()).trim();
        }
      }
    }
  }
  if (currentStep?.title) steps.push(currentStep as TaskImplementationStep);
  return steps.length > 0
    ? steps
    : [{ order: 1, title: "Implement the task", description: "Follow the markdown plan for implementation details.", files: [] }];
}

export class AITaskPlannerService extends AIServiceBase {
  private workspaceService: WorkspaceAnalysisService;
  private knowledgeService: RepositoryKnowledgeService;
  private llmService: LLMService;

  constructor(
    workspaceService?: WorkspaceAnalysisService,
    knowledgeService?: RepositoryKnowledgeService,
    llmService?: LLMService,
    configService?: AIConfigService
  ) {
    super("AITaskPlannerService", configService);
    this.knowledgeService = knowledgeService ?? new RepositoryKnowledgeService(undefined, undefined, undefined, undefined, configService);
    this.workspaceService = workspaceService ?? new WorkspaceAnalysisService(this.knowledgeService, undefined, llmService, configService);
    this.llmService = llmService ?? new LLMService(undefined, configService);
  }

  async plan(
    repository: string,
    taskDescription: string,
    scope?: TaskScope,
    prebuiltWorkspace?: WorkspaceAnalysis,
    options?: KnowledgeRetrievalOptions
  ): Promise<AITaskPlanResult> {
    return this.execute(repository, async (context) => {
      const canonicalScope = normalizeScope(scope);

      const workspaceAnalysis: WorkspaceAnalysis =
        prebuiltWorkspace ?? await this.workspaceService.analyze(repository, options);

      const retrievalQuery = `${taskDescription} implementation files services controllers dependencies testing`;
      const knowledgeResult: RepositoryKnowledgeResult = this.knowledgeService.retrieve(
        repository,
        retrievalQuery,
        options
      );

      const workspaceSummary = `
## Repository Context
- **Repository:** ${workspaceAnalysis.repository}
- **Language:** ${workspaceAnalysis.technologies.language}
- **Framework:** ${workspaceAnalysis.technologies.framework}
- **Database:** ${workspaceAnalysis.technologies.database} / ORM: ${workspaceAnalysis.technologies.orm}
- **Authentication:** ${workspaceAnalysis.technologies.authentication}
- **Total Files:** ${workspaceAnalysis.totalFiles}
- **Estimated Project Complexity:** ${workspaceAnalysis.estimatedComplexity}
- **Major Modules:** ${workspaceAnalysis.majorModules.join(", ") || "None detected"}
- **Entry Points:** ${workspaceAnalysis.entryPoints.join(", ") || "None detected"}
- **Build System:** ${workspaceAnalysis.buildSystem}
- **Services (Architecture):** ${workspaceAnalysis.architecture.services.slice(0, 6).join(", ")}
- **Controllers (Architecture):** ${workspaceAnalysis.architecture.controllers.slice(0, 6).join(", ")}
- **Scope of this Task:** ${canonicalScope}
`;

      const planPrompt = [
        `You are a Principal Software Engineer and Technical Lead creating a detailed, action-oriented Implementation Plan for "${repository}".`,
        ``,
        `Task Description: "${taskDescription}"`,
        `Task Scope: **${canonicalScope}**`,
        ``,
        `Your Implementation Plan MUST be structured with these exact Markdown headers:`,
        ``,
        `# Implementation Plan`,
        ``,
        `## Executive Summary`,
        `Brief overview of the task, its purpose, and the expected outcome.`,
        ``,
        `## Objectives`,
        `Bullet list of clear, measurable outcomes for this task.`,
        ``,
        `## Files Likely to Change`,
        `Bullet list of file paths or patterns expected to be modified, created, or deleted.`,
        ``,
        `## Dependencies`,
        `Bullet list of internal or external dependencies required (libraries, services, APIs, environment variables).`,
        ``,
        `## Implementation Plan`,
        `Numbered step-by-step breakdown using this format for each step:`,
        `### 1. [Step Title]`,
        `Description of the step, what to do, and why.`,
        ``,
        `## Risks`,
        `Bullet list of implementation risks, gotchas, or technical debt introduced.`,
        ``,
        `## Testing Strategy`,
        `Bullet list of testing types and specific areas to cover (unit, integration, e2e).`,
        ``,
        `## Effort Estimation`,
        `- **Estimated Complexity:** Trivial | Low | Medium | High | Very High`,
        `- **Estimated Development Time:** [e.g., 1 day | 2–3 days | 1 week]`,
        ``,
        `---`,
        ``,
        workspaceSummary,
        ``,
        `---`,
        ``,
        knowledgeResult.prompt,
      ].join("\n");

      const markdownPlan = await this.trackLLM(context, planPrompt, () =>
        this.llmService.chat(planPrompt)
      );

      const objectives = extractSectionList(markdownPlan, /^#+\s.*Objectives/i);
      const filesLikelyToChange = extractSectionList(markdownPlan, /^#+\s.*Files Likely to Change/i);
      const dependencies = extractSectionList(markdownPlan, /^#+\s.*Dependencies/i);
      const risks = extractSectionList(markdownPlan, /^#+\s.*Risks/i);
      const testingStrategy = extractSectionList(markdownPlan, /^#+\s.*Testing Strategy/i);
      const implementationSteps = extractImplementationSteps(markdownPlan);
      const estimatedComplexity = extractComplexity(markdownPlan, workspaceAnalysis.estimatedComplexity);
      const estimatedDevelopmentTime = extractDevTime(markdownPlan);

      const execMatch = markdownPlan.match(/##\s+Executive Summary\s*\n+([\s\S]+?)(?=\n##|\n#|$)/);
      const executiveSummary = execMatch
        ? execMatch[1].trim().slice(0, 600)
        : `Implementation plan for: ${taskDescription}`;

      return {
        executiveSummary,
        objectives: objectives.length > 0 ? objectives : [`Implement: ${taskDescription}`],
        filesLikelyToChange,
        dependencies,
        implementationSteps,
        risks: risks.length > 0 ? risks : ["Ensure backward compatibility with existing API contracts"],
        testingStrategy: testingStrategy.length > 0 ? testingStrategy : ["Write unit tests", "Verify integration endpoints"],
        estimatedComplexity,
        estimatedDevelopmentTime,
        markdownPlan,
        sources: knowledgeResult.sources,
        metadata: this.buildMetadata(repository, knowledgeResult, { taskDescription, scope: canonicalScope }) as any,
        stats: knowledgeResult.stats,
      };
    }, {
      category: "AIResponses",
      payload: { taskDescription, options },
    });
  }
}
