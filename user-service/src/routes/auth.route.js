import express from "express";
import { sentOTP, verifyOtp } from "../controllers/auth.controller.js";
const router = express.Router();

router.post("/sent-otp", sentOTP);
router.post("/verify-otp", verifyOtp);

export default router;
