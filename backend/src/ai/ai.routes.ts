import { Router } from "express";
import { AIController } from "./ai.controller";

const router = Router();
const controller = new AIController();

router.post(
  "/analyze",
  controller.analyzeRepository.bind(controller)
);

export default router;