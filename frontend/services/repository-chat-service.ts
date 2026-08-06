import { api } from "@/lib/axios";

// ── Request & Response types ─────────────────────────────────────────────────

export interface RepositoryChatRequest {
  /** The repository slug to ask about (e.g. "ForgeAI") */
  repository: string;
  /** The developer's natural language question */
  question: string;
}

/** Context domains injected into the LLM prompt for this response */
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

export interface RepositoryChatMetadata {
  repository: string;
  contextUsed: ContextDomain[];
  sources?: SourceReference[];
}

export interface RepositoryChatResponse {
  success: boolean;
  answer: string;
  metadata: RepositoryChatMetadata;
  sources?: SourceReference[];
}

// ── Service ──────────────────────────────────────────────────────────────────

/**
 * repositoryChatService
 *
 * Calls POST /api/chat/repository.
 * The Authorization header is injected automatically by the Axios interceptor
 * in lib/axios.ts — no manual token handling needed here.
 */
export const repositoryChatService = {
  /**
   * Ask a single question about a repository.
   *
   * @param request - { repository, question }
   * @returns { success, answer, metadata, sources }
   * @throws AxiosError if the request fails or the server returns an error
   */
  async ask(request: RepositoryChatRequest): Promise<RepositoryChatResponse> {
    const response = await api.post<RepositoryChatResponse>(
      "/api/chat/repository",
      request
    );

    return response.data;
  },
};
