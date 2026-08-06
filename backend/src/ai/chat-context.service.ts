import { RepositoryAnalysisResult } from "../github/analysis-pipeline.service";
import { FileRelevanceService } from "./file-relevance.service";

/** Domains that can appear in contextUsed metadata */
export type ContextDomain =
  | "summary"
  | "readme"
  | "architecture"
  | "apiRoutes"
  | "database"
  | "symbols"
  | "knowledgeGraph";

export interface SourceReference {
  name: string;
  path: string;
}

export interface BuiltContext {
  /** The full markdown prompt ready to send to the LLM */
  prompt: string;
  /** Which data domains were injected into the prompt */
  contextUsed: ContextDomain[];
  /** Relevant source file references used in the context */
  sources: SourceReference[];
}

const fileRelevanceService = new FileRelevanceService();

/**
 * ChatContextService
 *
 * Responsibility: Build a structured, LLM-ready context string from an
 * existing RepositoryAnalysisResult. Returns contextUsed and source file citations.
 * Does NOT re-run analysis.
 */
export class ChatContextService {
  /**
   * Builds the full prompt to send to the LLM, tracks context domains used,
   * and extracts relevant source file citations.
   *
   * @param analysis - Pre-computed analysis from AnalysisPipelineService
   * @param question - The user's natural language question
   */
  build(analysis: RepositoryAnalysisResult, question: string): BuiltContext {
    const sections: string[] = [];
    const contextUsed: ContextDomain[] = [];
    const sourcesMap = new Map<string, SourceReference>();

    const addSource = (filePath: string) => {
      if (!filePath || sourcesMap.has(filePath)) return;
      const fileName = filePath.split("/").pop() ?? filePath;
      sourcesMap.set(filePath, { name: fileName, path: filePath });
    };

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
    if (analysis.entryPoint?.exists && analysis.entryPoint.path) {
      addSource(analysis.entryPoint.path);
    }

    // ── README (truncated) ───────────────────────────────────────────────────
    if (analysis.readme?.exists && analysis.readme.content) {
      const readme =
        analysis.readme.content.length > 2000
          ? analysis.readme.content.slice(0, 2000) + "\n... (truncated)"
          : analysis.readme.content;
      sections.push(`## README\n${readme}`);
      contextUsed.push("readme");
      if (analysis.readme.path) {
        addSource(analysis.readme.path);
      } else {
        addSource("README.md");
      }
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

      // Extract architectural file references matching question keywords
      const allArchFiles = [
        ...(arch.controllers ?? []),
        ...(arch.services ?? []),
        ...(arch.routes ?? []),
        ...(arch.middleware ?? []),
        ...(arch.models ?? []),
      ];
      for (const file of allArchFiles) {
        if (typeof file === "string") {
          addSource(file);
        }
      }
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

    // ── Dynamic Relevant Source Files (Scored by query) ──────────────────────
    if (analysis.files?.length) {
      const topFiles = fileRelevanceService.rank(analysis.files, question, 5);
      if (topFiles.length > 0) {
        const fileSnippets = topFiles.map((file) => {
          addSource(file.path);
          const snippet =
            file.content.length > 3000
              ? file.content.slice(0, 3000) + "\n... (truncated)"
              : file.content;
          const ext = file.path.split(".").pop() ?? "";
          return `### ${file.path}\n\`\`\`${ext}\n${snippet}\n\`\`\``;
        });

        sections.push(`## Relevant Source Files\n${fileSnippets.join("\n\n")}`);
      }
    }

    // ── Exported Symbols (capped) ────────────────────────────────────────────
    if (analysis.symbols?.length) {
      const symbolLines = (analysis.symbols as any[])
        .filter((f: any) => f.symbols?.length > 0)
        .slice(0, 40)
        .map((f: any) => {
          if (f.file) addSource(f.file);
          return `- **${f.file}**: ${f.symbols
            .map((s: any) => `${s.name} (${s.type})`)
            .join(", ")}`;
        })
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

    const sources = Array.from(sourcesMap.values()).slice(0, 6);

    return { prompt: sections.join("\n\n---\n\n"), contextUsed, sources };
  }
}
