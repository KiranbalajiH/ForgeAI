import { api } from "@/lib/axios";

export interface RepositorySearchRequest {
  repository: string;
  query: string;
}

export interface SearchMatch {
  id: string;
  type: string;
  name: string;
  filePath?: string;
  content: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface SearchResult {
  files: SearchMatch[];
  symbols: SearchMatch[];
  controllers: SearchMatch[];
  services: SearchMatch[];
  routes: SearchMatch[];
  models: SearchMatch[];
  intent?: string;
}

export interface RepositorySearchResponse {
  success: boolean;
  results?: SearchResult;
  message?: string;
}

/**
 * repositorySearchService
 *
 * Provides API client methods for searching repository code index via POST /api/repositories/search.
 */
export const repositorySearchService = {
  async search(request: RepositorySearchRequest): Promise<RepositorySearchResponse> {
    const response = await api.post<RepositorySearchResponse>(
      "/api/repositories/search",
      request
    );
    return response.data;
  },
};
