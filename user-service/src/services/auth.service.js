import { sendOTPEmail, verifyOTPEmail } from "../config/email.js";
import prisma from "../config/prisma.js";
import bcrypt from "bcrypt";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
} from "../utils/error.js";
import { generateAndStoreOtp, validateOtp } from "../utils/otp.js";
import {
  createAndStoreToken,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/auth.js";
import { redis } from "../config/redis.js";
import config from "../config/index.js";
import { OAuth2Client } from "google-auth-library";
const client = new OAuth2Client(config.GOOGLE_CLIENT_ID);

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

  const { accessToken, refreshToken, safeUser } = await createAndStoreToken(
    currentUser,
    deviceId,
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

const verifyGoogleIdToken = async (idToken, deviceId) => {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: config.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (!payload.sub || !payload.email) {
    throw new UnauthorizedError("Invalid Google Id token");
  }

  const googleUser = {
    provider: payload.iss,
    providerId: payload.sub,
    email: payload.email,
    firstName: payload.given_name,
    lastName: payload.family_name,
    emailVerified: payload.email_verified || false,
  };

  const user = await prisma.$transaction(async (tx) => {
    const isGoogleAuthenticated = await tx.authProvider.findUnique({
      where: {
        provider_providerId: {
          provider: googleUser.provider,
          providerId: googleUser.providerId,
        },
      },
      include: {
        user: true,
      },
    });

    if (isGoogleAuthenticated) {
      return isGoogleAuthenticated.user;
    }

    const existingUser = await tx.user.findUnique({
      where: {
        email: googleUser.email,
      },
    });

    if (existingUser) {
      return await tx.authProvider.create({
        data: {
          provider: googleUser.provider,
          providerId: googleUser.providerId,
          userId: existingUser.id,
        },
      });
    }

    return tx.user.create({
      data: {
        email: googleUser.email,
        firstName: googleUser.firstName,
        lastName: googleUser.lastName,
        emailVerified: googleUser.emailVerified,
        AuthProviders: {
          creat: {
            provider: googleUser.provider,
            providerId: googleUser.provider,
          },
        },
      },
    });
  });

  const { accessToken, refreshToken, safeUser } = await createAndStoreToken(
    user,
    deviceId,
  );

  return { accessToken, refreshToken, loginnedUser: safeUser };
};
export default {
  sendOtp,
  verifyOtp,
  login,
  rotatedRefreshToken,
  verifyGoogleIdToken,
};
