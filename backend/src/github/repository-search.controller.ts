import { Request, Response } from "express";
import { RepositorySearchService } from "./repository-search.service";
import { repositoryIndexService } from "./repository-index.service";
import { analysisCacheService } from "../ai/analysis-cache.service";

/**
 * RepositorySearchController
 *
 * Responsibility: Handles REST API HTTP requests for repository search operations.
 * Validates request payload and delegates business logic execution to RepositorySearchService.
 */
export class RepositorySearchController {
  private searchService = new RepositorySearchService();

  /**
   * POST /api/repositories/search
   * Executes keyword search over an indexed repository with readiness guard checks.
   */
  async search(req: Request, res: Response) {
    try {
      const { repository, query } = req.body;

      // 1. Request payload validation
      if (!repository || typeof repository !== "string" || !repository.trim()) {
        return res.status(400).json({
          success: false,
          message: "repository is required and must be a non-empty string",
        });
      }

      if (!query || typeof query !== "string" || !query.trim()) {
        return res.status(400).json({
          success: false,
          message: "query is required and must be a non-empty string",
        });
      }

      const repoName = repository.trim();
      const statusInfo = repositoryIndexService.getStatus(repoName);
      const hasValidIndex = Boolean(
        repositoryIndexService.getIndex(repoName) || analysisCacheService.get(repoName)
      );

      // Readiness guards when NO valid index exists yet
      if (!hasValidIndex) {
        if (statusInfo.status === "NOT_INDEXED") {
          return res.status(200).json({
            success: true,
            results: {
              files: [],
              symbols: [],
              controllers: [],
              services: [],
              routes: [],
              models: [],
            },
            indexStatus: statusInfo,
            message: `Repository "${repoName}" has not been indexed yet. Please index the repository to enable code search.`,
          });
        }

        if (statusInfo.status === "INDEXING") {
          return res.status(200).json({
            success: true,
            results: {
              files: [],
              symbols: [],
              controllers: [],
              services: [],
              routes: [],
              models: [],
            },
            indexStatus: statusInfo,
            message: `Repository "${repoName}" is currently being indexed. Please wait for indexing to complete.`,
          });
        }

        if (statusInfo.status === "FAILED") {
          return res.status(200).json({
            success: true,
            results: {
              files: [],
              symbols: [],
              controllers: [],
              services: [],
              routes: [],
              models: [],
            },
            indexStatus: statusInfo,
            message: `Indexing failed for repository "${repoName}". ${statusInfo.indexError || ""}`,
          });
        }
      }

      // 2. Delegate search operation to service layer
      const results = this.searchService.search(repoName, query.trim());

      // 3. Return structured search results with indexStatus
      return res.status(200).json({
        success: true,
        results,
        indexStatus: statusInfo,
      });
    } catch (error: any) {
      console.error("Repository search controller error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Internal server error during repository search",
      });
    }
  }
}
