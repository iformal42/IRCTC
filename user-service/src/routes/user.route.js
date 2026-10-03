import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { getUserProfile } from "../controllers/user.controller.js";

const router = Router();

router.get("/profile", requireAuth, getUserProfile);

export default { router };
