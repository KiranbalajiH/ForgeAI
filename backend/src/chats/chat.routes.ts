import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import {
  create,
  getAll,
  getOne,
  remove,
} from "./chat.controller";

const router = Router({ mergeParams: true });

// Protect all chat routes
router.use(authenticateToken);

// Create a new chat session
router.post("/", create);

// Get all chat sessions for a project
router.get("/", getAll);

// Get a single chat session
router.get("/:id", getOne);

// Delete a chat session
router.delete("/:id", remove);

export default router;