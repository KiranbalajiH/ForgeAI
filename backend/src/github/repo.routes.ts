import { Router } from "express";
import { RepoController } from "./repo.controller";

const router = Router();
const controller = new RepoController();

router.post("/clone", controller.clone.bind(controller));
router.get("/:repoName/files", controller.read.bind(controller));
router.get("/:repoName/file", controller.readFile.bind(controller));

export default router;