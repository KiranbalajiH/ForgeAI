import {
  RepositoryKnowledgeService,
  RepositoryKnowledgeResult,
  KnowledgeRetrievalOptions,
  KnowledgeRetrievalStats,
} from "./repository-knowledge.service";
import { AnalysisPipelineService, RepositoryAnalysisResult } from "../github/analysis-pipeline.service";
import { analysisCacheService } from "./analysis-cache.service";
import { LLMService } from "./llm.service";
import { SourceReference, ContextDomain } from "./chat-context.service";
import { executeWithTelemetry } from "./ai-service.wrapper";
import { AIServiceBase } from "./ai-service.base";
import { AIConfigService } from "./ai-config.service";


// ─── Output model ─────────────────────────────────────────────────────────────

export type ProjectComplexity = "Low" | "Medium" | "High" | "Very High";

/**
 * WorkspaceAnalysis
 *
 * Structured output model designed to be reusable by any future AI workflow:
 *  - CI/CD pipeline health checks
 *  - Onboarding documentation generation
 *  - Automated code review scope selection
 *  - Dependency graph visualization
 *  - Sprint / ticket estimation
 */
export interface WorkspaceAnalysis {
  /** Repository name / slug */
  repository: string;

  /** High-level overview paragraph */
  overview: string;

  /** Primary programming languages and frameworks */
  technologies: {
    language: string;
    framework: string;
    packageManager: string;
    frontend: string;
    backend: string;
    database: string;
    orm: string;
    authentication: string;
  };

  /** Architectural layer summary */
  architecture: {
    controllers: string[];
    services: string[];
    routes: string[];
    middleware: string[];
    models: string[];
  };

  /** Major functional modules (e.g., "auth", "chat", "github") */
  majorModules: string[];

  /** Detected entry points */
  entryPoints: string[];

  /** Build system and tooling (e.g., "npm", "tsc", "next build") */
  buildSystem: string;

  /** Detected config files (tsconfig, .env, next.config, etc.) */
  configFiles: string[];

  /** Total number of analyzed source files */
  totalFiles: number;

  /** Estimated project complexity based on file count, modules, and dependencies */
  estimatedComplexity: ProjectComplexity;

  /** AI-generated recommendations in markdown format */
  aiRecommendations: string;

  /** Citable source references */
  sources: SourceReference[];

  /** Which data domains were used to build this analysis */
  contextDomainsUsed: ContextDomain[];

  /** Retrieval statistics */
  stats: KnowledgeRetrievalStats;

  /** ISO timestamp of analysis */
  analyzedAt: string;
}

// ─── Complexity heuristic ─────────────────────────────────────────────────────

function estimateComplexity(
  totalFiles: number,
  moduleCount: number,
  totalArchItems: number
): ProjectComplexity {
  const score = totalFiles * 0.5 + moduleCount * 5 + totalArchItems * 2;
  if (score < 40) return "Low";
  if (score < 120) return "Medium";
  if (score < 300) return "High";
  return "Very High";
}

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * WorkspaceAnalysisService
 *
 * Responsibility:
 *  1. Accept a repositoryId.
 *  2. Retrieve existing RepositoryAnalysisResult from cache or re-run the analysis pipeline.
 *  3. Retrieve high-level architectural context via RepositoryKnowledgeService.
 *  4. Build a structured WorkspaceAnalysis model from the combined data.
 *  5. Use LLMService to generate AI-powered recommendations for the repository.
 *  6. Return the complete WorkspaceAnalysis model.
 *
 * Designed to serve as the foundation for future AI workflows such as:
 *  - Automated onboarding doc generation
 *  - Sprint estimation and ticket scoping
 *  - CI/CD health check integration
 *  - Repository dependency graph analysis
 *  - Codebase-level refactoring suggestions
 */
export class WorkspaceAnalysisService extends AIServiceBase {
  private knowledgeService: RepositoryKnowledgeService;
  private pipeline: AnalysisPipelineService;
  private llmService: LLMService;

  constructor(
    knowledgeService?: RepositoryKnowledgeService,
    pipeline?: AnalysisPipelineService,
    llmService?: LLMService,
    configService?: AIConfigService
  ) {
    super("WorkspaceAnalysisService", configService);
    this.knowledgeService = knowledgeService ?? new RepositoryKnowledgeService(undefined, undefined, undefined, undefined, configService);
    this.pipeline = pipeline ?? new AnalysisPipelineService();
    this.llmService = llmService ?? new LLMService(undefined, configService);
  }

  /**
   * Produce a structured WorkspaceAnalysis for a given repository.
   *
   * @param repository - Repository name / slug
   * @param options    - Optional retrieval tuning parameters
   */
  async analyze(
    repository: string,
    options?: KnowledgeRetrievalOptions
  ): Promise<WorkspaceAnalysis> {
    return this.execute(repository, async (context) => {
        // ── 1. Get RepositoryAnalysisResult (from cache or pipeline) ─────────────
    let analysisResult: RepositoryAnalysisResult | null = analysisCacheService.get(repository);
    if (!analysisResult) {
      analysisResult = this.pipeline.analyze(repository);
    }

    // ── 2. Retrieve architectural knowledge via RepositoryKnowledgeService ───
    const retrievalQuery =
      "repository architecture overview entry point build system modules services controllers technology stack config dependencies";

    const knowledgeResult: RepositoryKnowledgeResult = this.knowledgeService.retrieve(
      repository,
      retrievalQuery,
      options
    );

    // ── 3. Extract structured data from the analysis result ──────────────────
    const summary = analysisResult.summary ?? {};
    const project = analysisResult.project ?? {};
    const technology = analysisResult.technology ?? {};
    const arch = analysisResult.architecture ?? {};
    const entryPoint = analysisResult.entryPoint;
    const pkg = analysisResult.package ?? {};

    const majorModules: string[] = Array.isArray(summary.majorModules)
      ? summary.majorModules
      : [];

    const entryPoints: string[] = [];
    if (entryPoint?.exists && entryPoint.path) {
      entryPoints.push(entryPoint.path);
    }

    // Detect config files from known common names in the package or analysis
    const configFiles = this.detectConfigFiles(analysisResult);

    // Build system derived from package manager + project type
    const buildSystem = this.inferBuildSystem(project, technology, pkg);

    const totalArchItems =
      (arch.controllers?.length ?? 0) +
      (arch.services?.length ?? 0) +
      (arch.routes?.length ?? 0) +
      (arch.middleware?.length ?? 0) +
      (arch.models?.length ?? 0);

    const estimatedComplexity = estimateComplexity(
      analysisResult.totalFiles ?? 0,
      majorModules.length,
      totalArchItems
    );

    // ── 4. Generate AI recommendations ──────────────────────────────────────
    const recommendationsPrompt = this.buildRecommendationsPrompt(
      repository,
      knowledgeResult.prompt,
      estimatedComplexity,
      totalArchItems,
      majorModules
    );

    const aiRecommendations = await this.trackLLM(context, "recommendations", () =>
      this.llmService.chat(recommendationsPrompt)
    );

    // ── 5. Assemble the WorkspaceAnalysis model ──────────────────────────────
    const overview =
      summary.repositoryType && project.language
        ? `${repository} is a ${summary.repositoryType} project written in ${project.language}` +
          (project.framework ? ` using ${project.framework}` : "") +
          `. It contains ${analysisResult.totalFiles} analyzed source files across ${majorModules.length || "multiple"} major modules.`
        : `${repository} contains ${analysisResult.totalFiles} analyzed source files.`;

    return {
      repository,
      overview,
      technologies: {
        language: project.language ?? technology.language ?? "Unknown",
        framework: project.framework ?? technology.framework ?? "Unknown",
        packageManager: project.packageManager ?? "Unknown",
        frontend: summary.frontend ?? "Unknown",
        backend: summary.backend ?? "Unknown",
        database: summary.database ?? "Unknown",
        orm: summary.orm ?? "Unknown",
        authentication: summary.authentication ?? "Unknown",
      },
      architecture: {
        controllers: arch.controllers ?? [],
        services: arch.services ?? [],
        routes: arch.routes ?? [],
        middleware: arch.middleware ?? [],
        models: arch.models ?? [],
      },
      majorModules,
      entryPoints,
      buildSystem,
      configFiles,
      totalFiles: analysisResult.totalFiles ?? 0,
      estimatedComplexity,
      aiRecommendations,
      sources: knowledgeResult.sources,
      contextDomainsUsed: knowledgeResult.metadata.contextDomainsUsed,
      stats: knowledgeResult.stats,
      analyzedAt: new Date().toISOString(),
    };
    }, {
      category: "AIResponses",
      payload: { options },
      ttlMs: 1000 * 60 * 60 * 24, // 24 hours for holistic workspace analysis
    });
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private buildRecommendationsPrompt(
    repository: string,
    knowledgePrompt: string,
    complexity: ProjectComplexity,
    archItemCount: number,
    modules: string[]
  ): string {
    return [
      `You are a Principal Software Engineer conducting a workspace health analysis for the "${repository}" repository.`,
      ``,
      `Estimated project complexity: **${complexity}**`,
      `Architecture items detected: ${archItemCount}`,
      `Major modules: ${modules.join(", ") || "None detected"}`,
      ``,
      `Based on the repository context below, provide **5 to 8 concise, actionable AI recommendations** to improve this codebase.`,
      `Focus on: architecture quality, maintainability, security posture, performance, test coverage gaps, and developer experience.`,
      `Format each recommendation as a numbered Markdown list item.`,
      ``,
      `---`,
      ``,
      knowledgePrompt,
    ].join("\n");
  }

  private inferBuildSystem(project: any, technology: any, pkg: any): string {
    const framework = (project.framework ?? technology.framework ?? "").toLowerCase();
    const pkgManager = project.packageManager ?? "npm";
    const scripts = pkg.scripts ?? {};

    if (framework.includes("next")) return `${pkgManager} (Next.js)`;
    if (framework.includes("vite")) return `${pkgManager} (Vite)`;
    if (framework.includes("nest")) return `${pkgManager} (NestJS + tsc)`;
    if (scripts.build?.includes("tsc")) return `${pkgManager} + tsc`;
    if (project.language?.toLowerCase() === "typescript") return `${pkgManager} + tsc`;
    return pkgManager ?? "Unknown";
  }

  private detectConfigFiles(analysis: RepositoryAnalysisResult): string[] {
    const known = [
      "tsconfig.json",
      ".env",
      ".env.local",
      "next.config.ts",
      "next.config.js",
      "tailwind.config.ts",
      "tailwind.config.js",
      "prisma/schema.prisma",
      ".eslintrc.json",
      ".eslintrc.js",
      "jest.config.ts",
      "jest.config.js",
      "vite.config.ts",
      "package.json",
    ];

    // Filter to files that exist in the analyzed file set if available
    const filePaths = (analysis.files ?? []).map((f: any) =>
      typeof f === "string" ? f : (f.path ?? "")
    );

    if (filePaths.length === 0) return known.slice(0, 5);

    const found = known.filter((cfg) =>
      filePaths.some((fp: string) => fp.endsWith(cfg) || fp.includes(cfg))
    );

    return found.length > 0 ? found : known.slice(0, 5);
  }
}
