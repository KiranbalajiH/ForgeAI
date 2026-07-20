import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import {
  create,
  getAll,
  getOne,
  update,
  remove,
} from "./project.controller";

const router = Router();

router.use(authenticateToken);

router.post("/", create);
router.get("/", getAll);
router.get("/:id", getOne);
router.put("/:id", update);
router.delete("/:id", remove);

export default router;