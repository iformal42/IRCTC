import { Router } from "express";
import { getUserProfile } from "../controllers/user.controller.js";
import { getUserContext } from "../middlewares/getUserContext.middleware.js";

const router = Router();

router.get("/profile", getUserContext, getUserProfile);

export default { router };
