import express from "express";
import {
  login,
  rotatedRefreshToken,
  sentOTP,
  verifyOtp,
} from "../controllers/auth.controller.js";
const router = express.Router();

router.post("/sent-otp", sentOTP);
router.post("/verify-otp", verifyOtp);
router.post("/login", login);
router.get("/refresh", rotatedRefreshToken);

export default router;
