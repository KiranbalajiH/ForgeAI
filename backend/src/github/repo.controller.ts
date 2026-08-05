import { Request, Response } from "express";
import { RepoService } from "./repo.service";
import { FileService } from "./file.service";
import { RepositoryAnalyzerService } from "./repository-analyzer.service";

const repoService = new RepoService();
const fileService = new FileService();
const repositoryAnalyzerService = new RepositoryAnalyzerService();

export class RepoController {
  async clone(req: Request, res: Response) {
    try {
      const { repoUrl, repoName } = req.body;

      if (!repoUrl || !repoName) {
        return res.status(400).json({
          success: false,
          message: "repoUrl and repoName are required",
        });
      }

      const result = await repoService.cloneRepository(repoUrl, repoName);

      return res.json(result);
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to clone repository",
      });
    }
  }

  async read(req: Request, res: Response) {
    try {
      const repoName = Array.isArray(req.params.repoName)
        ? req.params.repoName[0]
        : req.params.repoName;

      if (!repoName) {
        return res.status(400).json({
          success: false,
          message: "repoName is required",
        });
      }

      const files = fileService.readRepository(repoName);

      return res.json({
        success: true,
        data: files,
      });
    } catch (error: any) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  }

  async readFile(req: Request, res: Response) {
    try {
      const repoName = Array.isArray(req.params.repoName)
        ? req.params.repoName[0]
        : req.params.repoName;

      const { filePath } = req.query;

      if (!repoName) {
        return res.status(400).json({
          success: false,
          message: "repoName is required",
        });
      }

      if (!filePath || typeof filePath !== "string") {
        return res.status(400).json({
          success: false,
          message: "filePath query parameter is required",
        });
      }

      const content = fileService.readFile(repoName, filePath);

      return res.json({
        success: true,
        content,
      });
    } catch (error: any) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  }

  async analyze(req: Request, res: Response) {
    try {
      const { repoName } = req.body;

      if (!repoName) {
        return res.status(400).json({
          success: false,
          message: "repoName is required",
        });
      }

      const result = repositoryAnalyzerService.analyzeRepository(repoName);

      return res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}