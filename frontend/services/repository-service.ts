import { api } from "@/lib/axios";

export type RepositoryIndexState =
  | "NOT_INDEXED"
  | "INDEXING"
  | "INDEXED"
  | "STALE"
  | "FAILED";

export interface RepositoryIndexStatus {
  repository: string;
  status: RepositoryIndexState;
  lastSuccessfulIndexTime: string | null;
  lastAttemptedIndexTime: string | null;
  indexError: string | null;
  totalFiles?: number;
  totalChunks?: number;
}

export interface IndexStatusResponse {
  success: boolean;
  data?: RepositoryIndexStatus;
  message?: string;
}

export interface FileContentResponse {
  success: boolean;
  content?: string;
  message?: string;
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: "folder" | "file";
  children?: FileTreeNode[];
}

export interface FileTreeResponse {
  success: boolean;
  data?: FileTreeNode[];
  message?: string;
}

export interface RepositoryOverviewResponse {
  success: boolean;
  status?: RepositoryIndexState;
  message?: string;
  analysis?: {
    repository: string;
    overview: string;
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
    architecture: {
      controllers: string[];
      services: string[];
      routes: string[];
      middleware: string[];
      models: string[];
    };
    majorModules: string[];
    entryPoints: string[];
    buildSystem: string;
    configFiles: string[];
    totalFiles: number;
    estimatedComplexity: string;
    aiRecommendations: string;
    sources: any[];
    analyzedAt: string;
  };
}

export const repositoryService = {
  async getOverview(repoName: string): Promise<RepositoryOverviewResponse> {
    try {
      const response = await api.get<RepositoryOverviewResponse>(
        `/api/workspace/overview/${encodeURIComponent(repoName)}`
      );
      return response.data;
    } catch (err: any) {
      return {
        success: false,
        message: err?.response?.data?.message || err?.message || "Failed to fetch repository overview",
        status: err?.response?.data?.status,
      };
    }
  },

  async getFile(repoName: string, filePath: string): Promise<FileContentResponse> {
    const response = await api.get<FileContentResponse>(
      `/api/repositories/${encodeURIComponent(repoName)}/file`,
      {
        params: { filePath },
      }
    );
    return response.data;
  },

  async getTree(repoName: string): Promise<FileTreeResponse> {
    const response = await api.get<FileTreeResponse>(
      `/api/repositories/${encodeURIComponent(repoName)}/files`
    );
    return response.data;
  },

  async getIndexStatus(repoName: string): Promise<IndexStatusResponse> {
    try {
      const response = await api.get<IndexStatusResponse>(
        `/api/repositories/${encodeURIComponent(repoName)}/status`
      );
      return response.data;
    } catch (err: any) {
      return {
        success: false,
        message: err?.response?.data?.message || err?.message || "Failed to fetch repository status",
      };
    }
  },

  async triggerIndex(
    repoName: string,
    simulateFailure = false
  ): Promise<{ success: boolean; data?: any; status?: RepositoryIndexStatus; message?: string }> {
    try {
      const response = await api.post(
        `/api/repositories/analyze`,
        { repoName, simulateFailure }
      );
      return response.data;
    } catch (err: any) {
      return {
        success: false,
        message: err?.response?.data?.message || err?.message || "Failed to index repository",
        status: err?.response?.data?.status,
      };
    }
  },
};
