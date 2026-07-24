import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import { connect } from "./github.controller";

const router = Router();

// Protect all GitHub endpoints
router.use(authenticateToken);

// POST /github/connect
router.post("/connect", connect);

export default router;