import { api } from "@/lib/axios";

export interface RepositoryChatRequest {
  /** The repository slug to ask about (e.g. "ForgeAI") */
  repository: string;
  /** Natural language question about the codebase */
  question: string;
  /** Optional AI provider ID (e.g. "openai", "nvidia", "qwen") */
  provider?: string;
  /** Optional model identifier (e.g. "gpt-4o", "qwen-max") */
  model?: string;
}

export type ContextDomainCategory =
  | "overview"
  | "files"
  | "symbols"
  | "controllers"
  | "services"
  | "apiRoutes"
  | "databaseModels"
  | "summary";

export interface ContextDomain {
  category: ContextDomainCategory;
  count: number;
}

export interface SourceReference {
  name: string;
  path: string;
  type?: string;
}

export interface RepositoryChatMetadata {
  repository: string;
  provider?: string;
  model?: string;
  contextUsed: ContextDomain[];
  sources: SourceReference[];
}

export interface RepositoryChatResponse {
  success: boolean;
  answer: string;
  metadata: RepositoryChatMetadata;
  sources: SourceReference[];
}

export interface AIProviderInfo {
  id: string;
  name: string;
  models: string[];
}

export interface GetProvidersResponse {
  success: boolean;
  defaultProvider: string;
  providers: AIProviderInfo[];
}

/**
 * repositoryChatService
 *
 * Provides single-turn, provider/model selection, and streaming API methods for POST /api/chat/repository.
 */
export const repositoryChatService = {
  /**
   * Fetch available AI providers and their supported models.
   */
  async getProviders(): Promise<GetProvidersResponse> {
    const response = await api.get<GetProvidersResponse>("/api/chat/providers");
    return response.data;
  },

  /**
   * Ask a question about a repository (non-streaming).
   */
  async ask(request: RepositoryChatRequest): Promise<RepositoryChatResponse> {
    const response = await api.post<RepositoryChatResponse>(
      "/api/chat/repository",
      { ...request, stream: false },
      { headers: { Accept: "application/json" } }
    );
    return response.data;
  },

  /**
   * Ask a question about a repository with real-time SSE streaming.
   */
  async streamAsk(
    request: RepositoryChatRequest,
    onToken: (token: string) => void,
    onComplete: (metadata: RepositoryChatMetadata, sources: SourceReference[]) => void,
    onError: (errorMsg: string) => void
  ): Promise<void> {
    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || "";

      const response = await fetch(`${baseURL}/api/chat/repository`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Server returned HTTP ${response.status}`
        );
      }

      if (!response.body) {
        throw new Error("ReadableStream not supported by response");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;

          const jsonStr = trimmed.replace(/^data:\s*/, "");
          if (!jsonStr) continue;

          try {
            const parsed = JSON.parse(jsonStr);

            if (parsed.error) {
              onError(parsed.error);
              return;
            }

            if (parsed.token) {
              onToken(parsed.token);
            }

            if (parsed.done) {
              onComplete(parsed.metadata, parsed.sources || []);
              return;
            }
          } catch {
            // Ignore partial SSE JSON parse chunks
          }
        }
      }

      onComplete(
        { repository: request.repository, contextUsed: [], sources: [] },
        []
      );
    } catch (err: any) {
      console.error("[repositoryChatService.streamAsk] Error:", err);
      onError(err.message || "Failed to stream AI response");
    }
  },
};
