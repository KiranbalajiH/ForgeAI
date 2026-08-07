import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "./auth/auth.routes";
import projectRoutes from "./projects/project.routes";
import chatRoutes from "./chats/chat.routes";
import messageRoutes from "./messages/message.routes";
import githubRoutes from "./github/github.routes";
import repoRoutes from "./github/repo.routes";
import aiRoutes from "./ai/ai.routes";
import repositoryChatRoutes from "./chat/repository-chat.routes";
import repositorySearchRoutes from "./github/repository-search.routes";
import repositoryExplainRoutes from "./explain/repository-explain.routes";
import documentationGenerationRoutes from "./docs/documentation-generation.routes";
import codeReviewRoutes from "./review/code-review.routes";
import workspaceAnalysisRoutes from "./workspace/workspace-analysis.routes";
import refactoringPlannerRoutes from "./refactoring/refactoring-planner.routes";
import impactAnalysisRoutes from "./impact/impact-analysis.routes";
import changeRiskAssessmentRoutes from "./risk/change-risk-assessment.routes";
import aiTaskPlannerRoutes from "./planner/ai-task-planner.routes";

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());

// Routes
app.use("/auth", authRoutes);
app.use("/projects", projectRoutes);
app.use("/projects/:projectId/chats", chatRoutes);
app.use("/chats/:sessionId/messages", messageRoutes);
app.use("/github", githubRoutes);
app.use("/repo", repoRoutes);
app.use("/ai", aiRoutes);
app.use("/api/chat", repositoryChatRoutes);
app.use("/api/repositories", repositorySearchRoutes);
app.use("/api/explain", repositoryExplainRoutes);
app.use("/api/docs", documentationGenerationRoutes);
app.use("/api/review", codeReviewRoutes);
app.use("/api/workspace", workspaceAnalysisRoutes);
app.use("/api/refactoring", refactoringPlannerRoutes);
app.use("/api/impact", impactAnalysisRoutes);
app.use("/api/risk", changeRiskAssessmentRoutes);
app.use("/api/planner", aiTaskPlannerRoutes);

// Health Check
app.get("/", (_req, res) => {
  res.json({
    name: "ForgeAI Backend",
    version: "1.0.0",
    status: "healthy",
  });
});

export default app;