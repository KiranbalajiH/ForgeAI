import { Router } from "express";
import { DocumentController } from "./document.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();
const controller = new DocumentController();

router.get("/", authenticateToken, controller.list.bind(controller));
router.get("/:id", authenticateToken, controller.get.bind(controller));
router.post("/", authenticateToken, controller.create.bind(controller));
router.delete("/:id", authenticateToken, controller.delete.bind(controller));

export default router;
