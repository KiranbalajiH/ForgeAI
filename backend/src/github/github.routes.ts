import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import {
  connect,
  repositories,
} from "./github.controller";

const router = Router();

// Protect all GitHub endpoints
router.use(authenticateToken);

// POST /github/connect
router.post("/connect", connect);

// POST /github/repositories
router.post("/repositories", repositories);

export default router;