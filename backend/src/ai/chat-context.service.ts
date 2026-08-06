import { RepositoryAnalysisResult } from "../github/analysis-pipeline.service";

/** Domains that can appear in contextUsed metadata */
export type ContextDomain =
  | "summary"
  | "readme"
  | "architecture"
  | "apiRoutes"
  | "database"
  | "symbols"
  | "knowledgeGraph";

export interface BuiltContext {
  /** The full markdown prompt ready to send to the LLM */
  prompt: string;
  /** Which data domains were injected into the prompt */
  contextUsed: ContextDomain[];
}

/**
 * ChatContextService
 *
 * Responsibility: Build a structured, LLM-ready context string from an
 * existing RepositoryAnalysisResult. Does NOT re-run analysis.
 */
export class ChatContextService {
  /**
   * Builds the full prompt to send to the LLM, and tracks which data domains
   * were injected into the context.
   *
   * @param analysis - Pre-computed analysis from AnalysisPipelineService
   * @param question - The user's natural language question
   */
  build(analysis: RepositoryAnalysisResult, question: string): BuiltContext {
    const sections: string[] = [];
    const contextUsed: ContextDomain[] = [];

    // ── Persona ─────────────────────────────────────────────────────────────
    sections.push(
      `You are an expert software engineer assistant helping a developer understand the "${analysis.repository}" codebase. ` +
      `Answer questions accurately based only on the repository context provided. ` +
      `Reference specific file paths and function names when possible.`
    );

    // ── Project Overview ─────────────────────────────────────────────────────
    const tech = analysis.technology ?? {};
    const summary = analysis.summary ?? {};
    const project = analysis.project ?? {};

    sections.push(
      `## Repository: ${analysis.repository}\n` +
      `- **Language:** ${project.language ?? tech.language ?? "Unknown"}\n` +
      `- **Framework:** ${project.framework ?? tech.framework ?? "Unknown"}\n` +
      `- **Type:** ${summary.repositoryType ?? "Unknown"}\n` +
      `- **Total Files Analyzed:** ${analysis.totalFiles}\n` +
      `- **Entry Point:** ${analysis.entryPoint?.exists ? analysis.entryPoint.path : "Not detected"}`
    );
    contextUsed.push("summary");

    // ── README (truncated) ───────────────────────────────────────────────────
    if (analysis.readme?.exists && analysis.readme.content) {
      const readme =
        analysis.readme.content.length > 2000
          ? analysis.readme.content.slice(0, 2000) + "\n... (truncated)"
          : analysis.readme.content;
      sections.push(`## README\n${readme}`);
      contextUsed.push("readme");
    }

    // ── Architecture ─────────────────────────────────────────────────────────
    const arch = analysis.architecture;
    if (arch) {
      const fmt = (label: string, items: any[]) =>
        items?.length
          ? `**${label}:**\n${(items as string[]).map((f) => `- ${f}`).join("\n")}`
          : `**${label}:** None detected`;

      sections.push(
        `## Architecture\n` +
        [
          fmt("Controllers", arch.controllers),
          fmt("Services", arch.services),
          fmt("Routes", arch.routes),
          fmt("Middleware", arch.middleware),
          fmt("Models", arch.models),
        ].join("\n\n")
      );
      contextUsed.push("architecture");
    }

    // ── API Routes ───────────────────────────────────────────────────────────
    if (analysis.apiRoutes?.length) {
      const rows = (analysis.apiRoutes as any[])
        .map((r: any) => `| ${r.method} | ${r.path} | ${r.handler} |`)
        .join("\n");
      sections.push(
        `## API Routes\n| Method | Path | Handler |\n|---|---|---|\n${rows}`
      );
      contextUsed.push("apiRoutes");
    }

    // ── Database ─────────────────────────────────────────────────────────────
    if (analysis.database) {
      const db = analysis.database;
      sections.push(
        `## Database\n` +
        `- **Provider:** ${db.provider}\n` +
        `- **ORM:** ${db.orm}\n` +
        `- **Models:** ${(db.models as string[])?.join(", ") || "None"}`
      );
      contextUsed.push("database");
    }

    // ── Exported Symbols (capped) ────────────────────────────────────────────
    if (analysis.symbols?.length) {
      const symbolLines = (analysis.symbols as any[])
        .filter((f: any) => f.symbols?.length > 0)
        .slice(0, 40)
        .map(
          (f: any) =>
            `- **${f.file}**: ${f.symbols
              .map((s: any) => `${s.name} (${s.type})`)
              .join(", ")}`
        )
        .join("\n");
      sections.push(`## Exported Symbols\n${symbolLines}`);
      contextUsed.push("symbols");
    }

    // ── Knowledge Graph (node count reference) ──────────────────────────────
    if (analysis.knowledgeGraph?.nodes?.length) {
      sections.push(
        `## Knowledge Graph\n` +
        `- **Nodes:** ${analysis.knowledgeGraph.nodes.length}\n` +
        `- **Edges:** ${analysis.knowledgeGraph.edges?.length ?? 0}`
      );
      contextUsed.push("knowledgeGraph");
    }

    // ── User Question ────────────────────────────────────────────────────────
    sections.push(`## Question\n${question}`);

    return { prompt: sections.join("\n\n---\n\n"), contextUsed };
  }
}
