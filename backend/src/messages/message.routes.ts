import { Router } from "express";
import { authenticateToken } from "../middleware/auth.middleware";
import {
  create,
  getAll,
  getOne,
  remove,
} from "./message.controller";

const router = Router({ mergeParams: true });

router.use(authenticateToken);

router.post("/", create);
router.get("/", getAll);
router.get("/:id", getOne);
router.delete("/:id", remove);

export default router;