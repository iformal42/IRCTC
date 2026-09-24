import config from "../config/index.js";
import authService from "../services/auth.service.js";
import catchAsync from "../utils/catchAsync.js";
import { setCookies } from "../utils/cookies.js";
import { getFingerPrint } from "../utils/deviceFingerprint.js";
import { BadRequestError, UnauthorizedError } from "../utils/error.js";
const HOUR = 60 * 60;
const DAY = 24 * HOUR;
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

  setCookies(res, "otp_session", otpSessionId, {
    maxAge: config.OTP_TTL * 1000,
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

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    throw new BadRequestError("Email and Password is missing");

  const deviceId = getFingerPrint(req);

  const { accessToken, refreshToken, loginnedUser } = await authService.login(
    email,
    password,
    deviceId,
  );

  setCookies(res, "accessToken", accessToken, {
    maxAge: config.ACCESS_TOKEN_EXP * 60 * 1000, // minisec
  });

  setCookies(res, "refreshToken", refreshToken, {
    maxAge: config.REFRESH_TOKEN_EXP * DAY * 1000, // minisec
  });

  return res.status(201).json({
    success: true,
    data: loginnedUser,
  });
});

const rotatedRefreshToken = catchAsync(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (
    !refreshToken ||
    refreshToken === "undefined" ||
    refreshToken === "null"
  ) {
    throw new UnauthorizedError("Refresh token is missing", "LOGIN AGAIN");
  }
  const deviceId = getFingerPrint(req);

  const { newAccessToken, newRefreshToken } =
    await authService.rotatedRefreshToken(refreshToken, deviceId);
  setCookies(res, "accessToken", newAccessToken, {
    maxAge: config.ACCESS_TOKEN_EXP * 60 * 1000, // minisec
  });

  setCookies(res, "refreshToken", newRefreshToken, {
    maxAge: config.REFRESH_TOKEN_EXP * DAY * 1000, // minisec
  });
  return res.status(200).json({
    success: true,
    message: "Access token and refresh token reissued",
  });
});

const verifyGoogleIdToken = catchAsync(async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) {
    throw new BadRequestError("Invalide Google ID Token", "INVALID TOKEN");
  }
  const deviceId = getFingerPrint(req);

  const { accessToken, refreshToken, loginnedUser } =
    await authService.verifyGoogleIdToken(idToken, deviceId);

  setCookies(res, "accessToken", accessToken, {
    maxAge: config.ACCESS_TOKEN_EXP * 60 * 1000, // minisec
  });

  setCookies(res, "refreshToken", refreshToken, {
    maxAge: config.REFRESH_TOKEN_EXP * DAY * 1000, // minisec
  });

  return res.status(201).json({
    success: true,
    data: loginnedUser,
  });
});
export { sentOTP, verifyOtp, login, rotatedRefreshToken, verifyGoogleIdToken };
