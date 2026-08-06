import { Request, Response } from "express";
import { RepositorySearchService } from "./repository-search.service";

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
   * Executes keyword search over an indexed repository.
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

      // 2. Delegate search operation to service layer
      const results = this.searchService.search(
        repository.trim(),
        query.trim()
      );

      // 3. Return structured search results
      return res.status(200).json({
        success: true,
        results,
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
