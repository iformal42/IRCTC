import { sendOTPEmail, verifyOTPEmail } from "../config/email.js";
import prisma from "../config/prisma.js";
import bcrypt from "bcrypt";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
} from "../utils/error.js";
import { generateAndStoreOtp, validateOtp } from "../utils/otp.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/auth.js";
import { redis } from "../config/redis.js";
import config from "../config/index.js";

const sendOtp = async ({ firstName, lastName, email, password }) => {
  const isUserExists = await prisma.user.findUnique({
    where: { email },
  });
  if (isUserExists) {
    throw new ConflictError("User already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const meta = { firstName, lastName, email, password: hashedPassword };
  const { otp, otpSessionId } = await generateAndStoreOtp(meta);
  await sendOTPEmail({ email, otp });
  return { otpSessionId };
};

const verifyOtp = async (otp, otpSessionId) => {
  const meta = await validateOtp(otp, otpSessionId);

  if (!meta) {
    throw new BadRequestError("Invalid or Expired otp", "OTP_INVALID");
  }
  const { firstName, lastName, password, email } = meta;
  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      password,
      email,
      emailVerified: true,
    },
  });

  await verifyOTPEmail({ email });

  return user;
};

const login = async (email, password, deviceId) => {
  const currentUser = await prisma.user.findUnique({
    where: { email },
  });

  if (!currentUser) {
    throw new BadRequestError("Invalid creadentials.");
  }

  const doesPasswordMatch = await bcrypt.compare(
    password,
    currentUser.password,
  );

  if (!doesPasswordMatch) {
    throw new BadRequestError("Invalid creadentials.");
  }
  const userId = currentUser.id;
  const accessToken = generateAccessToken(userId);
  const { jti, refreshToken } = generateRefreshToken(userId);

  await redis.set(
    `refresh:${userId}:${deviceId}`,
    jti,
    "EX",
    config.REFRESH_TOKEN_EXP * 24 * 60 * 60,
  );
  const { password: _password, ...safeUser } = currentUser;
  await redis.set(
    `user:${userId}:`,
    JSON.stringify(safeUser),
    "EX",
    config.REDIS_USER_TTL,
  );

  return { accessToken, refreshToken, loginnedUser: safeUser };
};

const rotatedRefreshToken = async (refreshToken, deviceId) => {
  const payload = verifyRefreshToken(refreshToken);

  const { userId, jti } = payload;

  const cachedJti = await redis.get(`refresh:${userId}:${deviceId}`);

  if (!cachedJti) {
    throw new ForbiddenError("Session Expired", "LOGIN AGAIN");
  }

  if (jti !== cachedJti) {
    await redis.del(`refresh:${userId}:${deviceId}`);
    throw new ForbiddenError("Refresh token misused", "LOGIN AGAIN");
  }
  const newAccessToken = generateAccessToken(userId);
  const { jti: newJti, refreshToken: newRefreshToken } =
    generateRefreshToken(userId);
  await redis.set(
    `refresh:${userId}:${deviceId}`,
    newJti,
    "EX",
    config.REFRESH_TOKEN_EXP * 24 * 60 * 60,
  );

  return { newAccessToken, newRefreshToken };
};
export default { sendOtp, verifyOtp, login, rotatedRefreshToken };
