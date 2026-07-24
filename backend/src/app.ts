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

// Health Check
app.get("/", (_req, res) => {
  res.json({
    name: "ForgeAI Backend",
    version: "1.0.0",
    status: "healthy",
  });
});

export default app;