import config from "../config/index.js";
import authService from "../services/auth.service.js";
import catchAsync from "../utils/catchAsync.js";
import { BadRequestError } from "../utils/error.js";

const sentOTP = catchAsync(async (req, res, next) => {
  if (!req.body) {
    throw new BadRequestError("Data is not provided");
  }
  const { firstName, lastName, email, password, confirmPassword } = req.body;
  if (!firstName || !lastName || !email || !password || !confirmPassword) {
    throw new BadRequestError("All fields are required");
  }
  if (password !== confirmPassword) {
    throw new BadRequestError("Passwords do not match");
  }
  const { otpSessionId } = await authService.sendOtp({
    firstName,
    lastName,
    email,
    password,
  });

  res.cookie("otp_session", otpSessionId, {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: config.OTP_TTL * 1000, // Convert seconds to milliseconds
  });

  res.status(201).json({
    status: "success",
    message: "User registered successfully. Please verify your email.",
  });
});

const verifyOtp = catchAsync(async (req, res) => {
  const { otp } = req.body;

  const otpSessionId = req.cookies.otp_session;

  if (!otp || !otpSessionId) {
    throw new BadRequestError("OTP or otp session is missing");
  }

  const user = await authService.verifyOtp(otp, otpSessionId);

  return res.status(201).json({
    success: true,
    data: {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    },
  });
});

export { sentOTP, verifyOtp };
