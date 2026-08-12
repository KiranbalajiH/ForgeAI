import { api } from "@/lib/axios";
import Cookies from "js-cookie";

export interface RepositoryChatRequest {
  /** The repository slug to ask about (e.g. "ForgeAI") */
  repository: string;
  /** Natural language question about the codebase */
  question: string;
  /** Optional AI provider ID (e.g. "openai", "nvidia", "qwen") */
  provider?: string;
  /** Optional model identifier (e.g. "gpt-4o", "qwen-max") */
  model?: string;
  /** Optional session identifier to continue a conversation */
  sessionId?: string;
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
  lineNumber?: number;
}

export interface RepositoryChatMetadata {
  repository: string;
  provider?: string;
  model?: string;
  contextUsed: ContextDomain[];
  sources: SourceReference[];
  sessionId?: string;
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

export interface ChatSessionSummary {
  sessionId: string;
  createdAt: string;
  title: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  sources?: SourceReference[];
}

export interface ChatSession {
  sessionId: string;
  createdAt: string;
  messages: ChatMessage[];
}

export interface GetSessionsResponse {
  success: boolean;
  sessions: ChatSessionSummary[];
}

export interface GetSessionResponse {
  success: boolean;
  session: ChatSession;
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
   * List chat sessions for a repository.
   */
  async getSessions(repoName: string): Promise<GetSessionsResponse> {
    const response = await api.get<GetSessionsResponse>(`/api/chat/repository/${encodeURIComponent(repoName)}/sessions`);
    return response.data;
  },

  /**
   * Get a specific chat session for a repository.
   */
  async getSession(repoName: string, sessionId: string): Promise<GetSessionResponse> {
    const response = await api.get<GetSessionResponse>(`/api/chat/repository/${encodeURIComponent(repoName)}/sessions/${encodeURIComponent(sessionId)}`);
    return response.data;
  },

  /**
   * Rename a chat session.
   */
  async renameSession(repoName: string, sessionId: string, title: string): Promise<{ success: boolean; session: ChatSessionSummary }> {
    const response = await api.patch<{ success: boolean; session: ChatSessionSummary }>(
      `/api/chat/repository/${encodeURIComponent(repoName)}/sessions/${encodeURIComponent(sessionId)}`,
      { title }
    );
    return response.data;
  },

  /**
   * Delete a chat session.
   */
  async deleteSession(repoName: string, sessionId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete<{ success: boolean; message: string }>(
      `/api/chat/repository/${encodeURIComponent(repoName)}/sessions/${encodeURIComponent(sessionId)}`
    );
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
      const token = Cookies.get("token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${baseURL}/api/chat/repository`, {
        method: "POST",
        headers,
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
