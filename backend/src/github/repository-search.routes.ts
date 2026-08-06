import { Router } from "express";
import { RepositorySearchController } from "./repository-search.controller";

const router = Router();
const controller = new RepositorySearchController();

// POST /api/repositories/search
router.post("/search", controller.search.bind(controller));

export default router;
