import { Router } from "express";
import createproxy from "../services/proxy.service.js";
import config from "../config/index.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();
const userServiceProxy = createproxy(
  config.SERVCIES.USER_SERVICE_NAME,
  config.SERVCIES.USER_SERVICE_URL,
);

router.post("/users/auth/login", userServiceProxy);
router.get("/users/user/profile", requireAuth, userServiceProxy);

export default router;
