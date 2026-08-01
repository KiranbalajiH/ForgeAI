import { Request, Response } from "express";
import { RepositoryAnalyzerService } from "../github/repository-analyzer.service";
import { ProjectContextBuilderService } from "./project-context-builder.service";
import { PromptBuilderService } from "./prompt-builder.service";
import { LLMService } from "./llm.service";

const repositoryAnalyzer = new RepositoryAnalyzerService();
const contextBuilder = new ProjectContextBuilderService();
const promptBuilder = new PromptBuilderService();
const llmService = new LLMService();

export class AIController {
  async analyzeRepository(req: Request, res: Response) {
    try {
      const { repoName } = req.body;

      if (!repoName) {
        return res.status(400).json({
          success: false,
          message: "repoName is required",
        });
      }

      // Step 1: Analyze repository
      const analysis = repositoryAnalyzer.analyzeRepository(repoName);

      // Step 2: Build project context
      const context = contextBuilder.build(analysis);

      // Step 3: Build AI prompt
      const prompt =
        promptBuilder.buildRepositoryAnalysisPrompt(context);

      // Step 4: Ask the LLM
      const result = await llmService.chat(prompt);

      return res.json({
        success: true,
        repository: repoName,
        analysis: result,
      });
    } catch (error: any) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}