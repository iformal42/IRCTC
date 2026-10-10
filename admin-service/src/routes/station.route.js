import { Router } from "express";
import { getUserContext } from "../middlewares/getUserContext.middleware.js";
import { createStation } from "../controllers/station.controller.js";

const router = Router();

router.route("/").post(getUserContext, createStation);

export default router;
