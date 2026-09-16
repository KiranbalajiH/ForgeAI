import { Router } from "express";
import { ChatController } from "./chat.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();
const controller = new ChatController();

router.get("/providers", authenticateToken, controller.getProviders.bind(controller));
router.get("/repository/:repoName/sessions", authenticateToken, controller.listSessions.bind(controller));
router.get("/repository/:repoName/sessions/:sessionId", authenticateToken, controller.getSession.bind(controller));
router.patch("/repository/:repoName/sessions/:sessionId", authenticateToken, controller.renameSession.bind(controller));
router.delete("/repository/:repoName/sessions/:sessionId", authenticateToken, controller.deleteSession.bind(controller));

// Chat query routes
router.post("/repository", authenticateToken, controller.ask.bind(controller));
router.post("/ask", authenticateToken, controller.ask.bind(controller));

export default router;
