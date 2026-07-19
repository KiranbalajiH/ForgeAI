import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import authRoutes from "./auth/auth.routes";

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());

// Auth Routes
app.use("/auth", authRoutes);

// Health Check Route
app.get("/", (_req, res) => {
  res.status(200).json({
    name: "ForgeAI Backend",
    version: "1.0.0",
    status: "healthy",
  });
});

export default app;