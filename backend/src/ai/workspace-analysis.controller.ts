import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { WorkspaceAnalysisService } from "./workspace-analysis.service";
import { repositoryIndexService } from "../github/repository-index.service";

const workspaceAnalysisService = new WorkspaceAnalysisService();

/**
 * WorkspaceAnalysisController
 *
 * Exposes:
 *   POST /api/workspace/analyze
 *   GET  /api/workspace/overview/:repoName
 *   POST /api/workspace/overview
 */
export class WorkspaceAnalysisController {
  async analyze(req: Request, res: Response) {
    try {
      const { repository } = req.body;

      if (!repository || typeof repository !== "string" || !repository.trim()) {
        return res.status(400).json({
          success: false,
          message: "repository is required",
        });
      }

      const repoName = repository.trim();
      const analysis = await workspaceAnalysisService.analyze(repoName);

      return res.json({
        success: true,
        analysis,
      });
    } catch (error: any) {
      console.error("[WorkspaceAnalysisController] Error:", error);

      return res.status(500).json({
        success: false,
        message: error.message ?? "Failed to analyze workspace",
      });
    }
  }

  async getOverview(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const repoName = req.params.repoName || req.body.repository || req.query.repository;

      if (!repoName || typeof repoName !== "string" || !repoName.trim()) {
        return res.status(400).json({
          success: false,
          message: "repoName is required",
        });
      }

      const name = repoName.trim();
      const statusInfo = repositoryIndexService.getStatus(name);

      if (statusInfo.status === "NOT_INDEXED") {
        return res.json({
          success: false,
          status: statusInfo.status,
          message: `Repository "${name}" is not indexed yet. Please index the repository to view the Overview.`,
        });
      }

      if (statusInfo.status === "INDEXING") {
        return res.json({
          success: false,
          status: statusInfo.status,
          message: `Repository "${name}" is currently being indexed. Overview will be available once indexing completes.`,
        });
      }

      if (statusInfo.status === "FAILED") {
        return res.json({
          success: false,
          status: statusInfo.status,
          message: `Repository "${name}" indexing failed: ${statusInfo.indexError || "Unknown error"}.`,
        });
      }

      // INDEXED or STALE
      const analysis = await workspaceAnalysisService.analyze(name);

      return res.json({
        success: true,
        status: statusInfo.status,
        analysis,
      });
    } catch (error: any) {
      console.error("[WorkspaceAnalysisController] Overview Error:", error);

      return res.status(500).json({
        success: false,
        message: error.message ?? "Failed to generate repository overview",
      });
    }
  }
}
