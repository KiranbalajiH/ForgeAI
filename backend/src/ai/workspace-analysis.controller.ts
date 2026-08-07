import { Request, Response } from "express";
import { WorkspaceAnalysisService } from "./workspace-analysis.service";

const workspaceAnalysisService = new WorkspaceAnalysisService();

/**
 * WorkspaceAnalysisController
 *
 * Exposes:
 *   POST /api/workspace/analyze
 *     Body:    { repository: string }
 *     Returns: { success: true, analysis: WorkspaceAnalysis }
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
}
