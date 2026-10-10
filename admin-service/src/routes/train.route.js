import { Router } from "express";
import { getUserContext } from "../middlewares/getUserContext.middleware.js";
import { createTrain } from "../controllers/train.controller.js";

const router = Router();

router.route("/").post(getUserContext, createTrain);

export default router;
