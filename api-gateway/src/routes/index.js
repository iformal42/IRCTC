import { Router } from "express";
import createproxy from "../services/proxy.service.js";
import config from "../config/index.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { windowRateLimit } from "../middleware/rateLimite.middleware.js";

const router = Router();
const userServiceProxy = createproxy(
  config.SERVCIES.USER_SERVICE_NAME,
  config.SERVCIES.USER_SERVICE_URL,
);
const adminServiceProxy = createproxy(
  config.SERVCIES.ADMIN_SERVICE_NAME,
  config.SERVCIES.ADMIN_SERVICE_URL,
);
const searchServiceProxy = createproxy(
  config.SERVCIES.SEARCH_SERVICE_NAME,
  config.SERVCIES.SEARCH_SERVICE_URL,
);
// TODO: to create rate limiter middleware
router.post("/users/auth/login", windowRateLimit(5, 20), userServiceProxy);
router.get(
  "/users/user/profile",
  requireAuth,
  windowRateLimit(5, 20),
  userServiceProxy,
);

router.post("/admins/station", requireAuth, adminServiceProxy);
router.post("/admins/train", requireAuth, adminServiceProxy);
router.post("/admins/train/route", requireAuth, adminServiceProxy);
router.post("/admins/schedule", requireAuth, adminServiceProxy);

router.get(
  "/searches/search/station",
  requireAuth,
  windowRateLimit(5, 20),
  searchServiceProxy,
);
router.get(
  "/searches/search/auto-complete/station",
  requireAuth,
  windowRateLimit(20, 20),
  searchServiceProxy,
);

export default router;
