import { RepositoryAnalysisResult } from "../github/analysis-pipeline.service";
import { FileRelevanceService } from "./file-relevance.service";
import { buildChatSystemPrompt } from "./prompts/chat-system.prompt";

const MAX_FILE_CONTENT_CHARS = 8000;
const MAX_FILES_SMALL_REPO = 999; // Effectively unlimited — inject all
const MAX_FILES_MEDIUM_REPO = 10;
const MAX_FILES_LARGE_REPO = 5;
const SMALL_REPO_THRESHOLD = 50;
const LARGE_REPO_THRESHOLD = 200;

const fileRelevanceService = new FileRelevanceService();

/**
 * Builds the full context passed to the LLM for each chat turn.
 *
 * Produces:
 *   - systemPrompt: static per-repo context (assembled once, cached externally)
 *   - userContext:  dynamic per-query file context (selected by relevance)
 */
export class RepoChatContextBuilderService {
  /**
   * Builds the static system prompt containing all structural repo information.
   * This is sent as the system message on every chat turn.
   */
  buildSystemPrompt(analysis: RepositoryAnalysisResult): string {
    const sections: string[] = [buildChatSystemPrompt()];

    // ── Project Overview ──────────────────────────────────────────────────
    sections.push(`
## Repository: ${analysis.repository}

### Project Overview
- **Type:** ${analysis.summary?.repositoryType ?? "Unknown"}
- **Language:** ${analysis.project?.language ?? "Unknown"}
- **Framework:** ${analysis.project?.framework ?? "Unknown"}
- **Package Manager:** ${analysis.project?.packageManager ?? "Unknown"}
- **Frontend:** ${analysis.summary?.frontend ?? "Unknown"}
- **Backend:** ${analysis.summary?.backend ?? "Unknown"}
- **Database:** ${analysis.summary?.database ?? "Unknown"}
- **ORM:** ${analysis.summary?.orm ?? "Unknown"}
- **Authentication:** ${analysis.summary?.authentication ?? "Unknown"}
- **Size:** ${analysis.summary?.repositorySize ?? "Unknown"} (${analysis.totalFiles} analyzed files)
- **Entry Point:** ${analysis.entryPoint?.exists ? analysis.entryPoint.path : "Not Detected"}
- **Major Modules:** ${analysis.summary?.majorModules?.join(", ") || "None Detected"}`);

    // ── README ────────────────────────────────────────────────────────────
    if (analysis.readme?.exists && analysis.readme.content) {
      const readmeContent =
        analysis.readme.content.length > 3000
          ? analysis.readme.content.slice(0, 3000) + "\n\n... (truncated)"
          : analysis.readme.content;

      sections.push(`
### README
${readmeContent}`);
    }

    // ── Architecture ──────────────────────────────────────────────────────
    const arch = analysis.architecture;
    sections.push(`
### Architecture

**Controllers:**
${arch.controllers.length ? (arch.controllers as string[]).map((f: string) => `- ${f}`).join("\n") : "- None Detected"}

**Services:**
${arch.services.length ? (arch.services as string[]).map((f: string) => `- ${f}`).join("\n") : "- None Detected"}

**Routes:**
${arch.routes.length ? (arch.routes as string[]).map((f: string) => `- ${f}`).join("\n") : "- None Detected"}

**Middleware:**
${arch.middleware.length ? (arch.middleware as string[]).map((f: string) => `- ${f}`).join("\n") : "- None Detected"}

**Models:**
${arch.models.length ? (arch.models as string[]).map((f: string) => `- ${f}`).join("\n") : "- None Detected"}`);

    // ── API Endpoints ─────────────────────────────────────────────────────
    if (analysis.apiRoutes?.length) {
      const routeTable = (analysis.apiRoutes as any[])
        .map((r: any) => `| ${String(r.method).padEnd(6)} | ${String(r.path).padEnd(40)} | ${r.handler} |`)
        .join("\n");

      sections.push(`
### API Endpoints
| Method | Path                                     | Handler |
|--------|------------------------------------------|---------|
${routeTable}`);
    }

    // ── Database ──────────────────────────────────────────────────────────
    if (analysis.database) {
      sections.push(`
### Database (${analysis.database.provider})
- **ORM:** ${analysis.database.orm}
- **Generator:** ${analysis.database.generator}
- **Models:** ${analysis.database.models.join(", ") || "None"}`);
    }

    // ── Symbols ───────────────────────────────────────────────────────────
    if (analysis.symbols?.length) {
      const symbolLines = (analysis.symbols as any[])
        .filter((f: any) => f.symbols.length > 0)
        .slice(0, 60) // Cap to avoid flooding context
        .map((f: any) => {
          const symbolList = f.symbols
            .map((s: any) => `${s.name} (${s.type})`)
            .join(", ");
          return `- **${f.file}**: ${symbolList}`;
        })
        .join("\n");

      sections.push(`
### Exported Symbols
${symbolLines}`);
    }

    // ── Module Relationships ──────────────────────────────────────────────
    if (analysis.relationships?.length) {
      const relLines = (analysis.relationships as any[])
        .slice(0, 40)
        .map((r: any) => `- ${r.source} \u2192 ${r.target}`)
        .join("\n");

      sections.push(`
### Module Import Relationships (sample)
${relLines}`);
    }

    return sections.join("\n\n---\n\n");
  }

  /**
   * Builds the dynamic file context block for a specific user query.
   * Files are scored by relevance to the query and injected with their content.
   */
  buildFileContext(
    analysis: RepositoryAnalysisResult,
    query: string
  ): string {
    if (!analysis.files?.length) {
      return "";
    }

    const topN = this.getFileLimit(analysis.totalFiles);
    const relevantFiles = fileRelevanceService.rank(
      analysis.files,
      query,
      topN
    );

    if (!relevantFiles.length) {
      return "";
    }

    const sections = relevantFiles.map((file) => {
      const content =
        file.content.length > MAX_FILE_CONTENT_CHARS
          ? file.content.slice(0, MAX_FILE_CONTENT_CHARS) +
            "\n\n... (file truncated)"
          : file.content;

      const ext = file.path.split(".").pop() ?? "";

      return `### ${file.path}
\`\`\`${ext}
${content}
\`\`\``;
    });

    return `## Relevant Source Files\n\n${sections.join("\n\n")}`;
  }

  private getFileLimit(totalFiles: number): number {
    if (totalFiles <= SMALL_REPO_THRESHOLD) {
      return MAX_FILES_SMALL_REPO;
    }

    if (totalFiles >= LARGE_REPO_THRESHOLD) {
      return MAX_FILES_LARGE_REPO;
    }

    return MAX_FILES_MEDIUM_REPO;
  }

  /**
   * Builds the final prompt from the retrieved context.
   */
  buildFromRetrievedContext(
    repository: string,
    query: string,
    retrieved: any
  ): { prompt: string; contextUsed: any[]; sources: any[] } {
    return {
      prompt: `Context for ${repository}:\n\nQuery: ${query}`,
      contextUsed: [],
      sources: []
    };
  }
}
