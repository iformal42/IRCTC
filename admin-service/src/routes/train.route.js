import { Router } from "express";
import { getUserContext } from "../middlewares/getUserContext.middleware.js";
import { createRoute, createTrain } from "../controllers/train.controller.js";

const router = Router();

router.route("/").post(getUserContext, createTrain);
router.route("/route").post(getUserContext, createRoute);

export default router;
