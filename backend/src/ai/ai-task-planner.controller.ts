import { Request, Response } from "express";
import { AITaskPlannerService } from "./ai-task-planner.service";

const taskPlannerService = new AITaskPlannerService();

/**
 * AITaskPlannerController
 *
 * Exposes:
 *   POST /api/planner/plan
 *     Body:    { repository: string, taskDescription: string, scope?: "Repository" | "Module" | "File" }
 *     Returns: {
 *       success: true,
 *       executiveSummary: string,
 *       objectives: string[],
 *       filesLikelyToChange: string[],
 *       dependencies: string[],
 *       implementationSteps: TaskImplementationStep[],
 *       risks: string[],
 *       testingStrategy: string[],
 *       estimatedComplexity: "Trivial" | "Low" | "Medium" | "High" | "Very High",
 *       estimatedDevelopmentTime: string,
 *       markdownPlan: string,
 *       sources: SourceReference[],
 *       metadata: { repository, taskDescription, scope, intent, contextDomainsUsed, strategy },
 *       stats: KnowledgeRetrievalStats
 *     }
 */
export class AITaskPlannerController {
  async plan(req: Request, res: Response) {
    try {
      const { repository, taskDescription, scope } = req.body;

      if (!repository || typeof repository !== "string" || !repository.trim()) {
        return res.status(400).json({
          success: false,
          message: "repository is required",
        });
      }

      if (!taskDescription || typeof taskDescription !== "string" || !taskDescription.trim()) {
        return res.status(400).json({
          success: false,
          message: "taskDescription is required",
        });
      }

      const repoName = repository.trim();
      const desc = taskDescription.trim();
      const targetScope = scope && typeof scope === "string" ? scope.trim() : undefined;

      const result = await taskPlannerService.plan(
        repoName,
        desc,
        targetScope
      );

      return res.json({
        success: true,
        executiveSummary: result.executiveSummary,
        objectives: result.objectives,
        filesLikelyToChange: result.filesLikelyToChange,
        dependencies: result.dependencies,
        implementationSteps: result.implementationSteps,
        risks: result.risks,
        testingStrategy: result.testingStrategy,
        estimatedComplexity: result.estimatedComplexity,
        estimatedDevelopmentTime: result.estimatedDevelopmentTime,
        markdownPlan: result.markdownPlan,
        sources: result.sources,
        metadata: result.metadata,
        stats: result.stats,
      });
    } catch (error: any) {
      console.error("[AITaskPlannerController] Error:", error);

      return res.status(500).json({
        success: false,
        message: error.message ?? "Failed to generate AI task plan",
      });
    }
  }
}
