import { Request, Response } from "express";
import { DocumentationGenerationService } from "./documentation-generation.service";

const docGenService = new DocumentationGenerationService();

/**
 * DocumentationGenerationController
 *
 * Exposes:
 *   POST /api/docs/generate
 *     Body:    { repository: string, documentationType: string }
 *     Returns: { success: true, documentation: string, sources, metadata, stats }
 */
export class DocumentationGenerationController {
  async generate(req: Request, res: Response) {
    try {
      const { repository, documentationType } = req.body;

      if (!repository || typeof repository !== "string" || !repository.trim()) {
        return res.status(400).json({
          success: false,
          message: "repository is required",
        });
      }

      if (
        !documentationType ||
        typeof documentationType !== "string" ||
        !documentationType.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "documentationType is required",
        });
      }

      const repoName = repository.trim();
      const docType = documentationType.trim();

      const result = await docGenService.generate(repoName, docType);

      return res.json({
        success: true,
        documentation: result.documentation,
        sources: result.sources,
        metadata: result.metadata,
        stats: result.stats,
      });
    } catch (error: any) {
      console.error("[DocumentationGenerationController] Error:", error);

      return res.status(500).json({
        success: false,
        message: error.message ?? "Failed to generate documentation",
      });
    }
  }
}
