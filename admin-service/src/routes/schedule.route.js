import { Router } from "express";
import { getUserContext } from "../middlewares/getUserContext.middleware.js";
import { createShcedule } from "../controllers/scheduler.controller.js";

const router = Router();

router.route("/").post(getUserContext, createShcedule);

export default router;
