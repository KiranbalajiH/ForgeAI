import { Router } from "express";
import { RepoController } from "./repo.controller";
import { RepoChatController } from "./repo-chat.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();
const controller = new RepoController();
const chatController = new RepoChatController();

router.post("/clone", controller.clone.bind(controller));
router.post("/analyze", controller.analyze.bind(controller));

router.get("/:repoName/files", controller.read.bind(controller));
router.get("/:repoName/file", controller.readFile.bind(controller));

// Repository Chat routes — all protected by JWT
// Note: POST /chat supports ?token= query param for native EventSource SSE clients
router.post("/:repoName/chat", authenticateToken, chatController.chat.bind(chatController));
router.get("/:repoName/chat/:sessionId", authenticateToken, chatController.getSession.bind(chatController));
router.delete("/:repoName/chat/:sessionId", authenticateToken, chatController.deleteSession.bind(chatController));

export default router;