import { api } from "@/lib/axios";
import Cookies from "js-cookie";

// ── Request & Response types ─────────────────────────────────────────────────

export interface RepositoryChatRequest {
  /** The repository slug to ask about (e.g. "ForgeAI") */
  repository: string;
  /** The developer's natural language question */
  question: string;
  /** Optional stream flag */
  stream?: boolean;
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
 * Provides single-turn and streaming API methods for POST /api/chat/repository.
 */
export const repositoryChatService = {
  /**
   * Ask a question about a repository (non-streaming).
   */
  async ask(request: RepositoryChatRequest): Promise<RepositoryChatResponse> {
    const response = await api.post<RepositoryChatResponse>(
      "/api/chat/repository",
      { ...request, stream: false }
    );

    return response.data;
  },

  /**
   * Stream the AI response tokens in real-time using Server-Sent Events (SSE).
   *
   * @param request - { repository, question }
   * @param onToken - Callback invoked incrementally as each token arrives
   * @param onComplete - Callback invoked when streaming completes with metadata & sources
   * @param onError - Callback invoked if an error occurs
   */
  async streamAsk(
    request: RepositoryChatRequest,
    onToken: (token: string) => void,
    onComplete: (metadata: RepositoryChatMetadata, sources: SourceReference[]) => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      const token = Cookies.get("token");
      const baseURL = process.env.NEXT_PUBLIC_API_URL || "";

      const response = await fetch(`${baseURL}/api/chat/repository`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ...request, stream: true }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.message || `Request failed with status ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response body is not readable");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;

          const jsonStr = line.slice(5).trim();
          if (!jsonStr) continue;

          const data = JSON.parse(jsonStr);

          if (data.error) {
            onError(data.error);
            return;
          }

          if (data.token) {
            onToken(data.token);
          }

          if (data.done) {
            const sources = data.metadata?.sources ?? data.sources ?? [];
            onComplete(data.metadata, sources);
            return;
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to stream response";
      onError(msg);
    }
  },
};
