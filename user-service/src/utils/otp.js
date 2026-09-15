import config from "../config/index.js";
import { redis } from "../config/redis.js";
import { TooManyRequest } from "./error.js";
import crypto from "node:crypto";
import otpGenerator from "otp-generator";
const RATE_MAX = config.OTP_RATE_MAX_PER_HOUR;
const ATTEMPT_MAX = config.OTP_MAX_VERIFY_ATTEMPTS;
const HMAC_SECRET = config.OTP_HMAC_SECRET;
const OTP_TTL = config.OTP_TTL;
const HOUR = 60 * 60; // secs

const hmacFor = (email, otp) => {
  return crypto
    .createHmac("sha256", HMAC_SECRET)
    .update(`${email}:${otp}`)
    .digest("hex");
};
export const generateAndStoreOtp = async (meta) => {
  const { email } = meta;
  const rateKey = `otp:rate:${email}`;
  const sentCount = parseInt((await redis.get(rateKey)) || "0", 10);
  if (sentCount >= RATE_MAX) {
    throw new TooManyRequest(
      "Too many OTP requests. Try again later",
      "OTP_RATE_LIMITER",
    );
  }

  const otp = otpGenerator.generate(6, {
    uppperCaseAlphabets: false,
    lowerCaseAlphabets: false,
    specialChars: false,
  });

  const otpSessionId = crypto.randomUUID();

  const hashedOtp = hmacFor(email, otp);

  await redis.set(
    `otp:session:${otpSessionId}`,
    JSON.stringify({
      hashedOtp,
      meta,
    }),
    "EX",
    OTP_TTL,
  );
  await redis.incr(rateKey);
  await redis.expire(rateKey, HOUR);
  return { otp, otpSessionId };
};

export const validateOtp = async (otp, otpSessionId) => {
  const sessionKey = `otp:session:${otpSessionId}`;
  const rawData = await redis.get(sessionKey);

  if (!rawData) return null;
  const { hashedOtp: storeOtp, meta } = JSON.parse(rawData);
  const { email } = meta;
  const attemptsKey = `otp:attempt:${email}`;
  if (attemptsKey >= ATTEMPT_MAX) {
    throw new TooManyRequest("Too many attempt to verify otp. Try again later");
  }
  const hashedOtp = hmacFor(email, otp);

  if (
    crypto.timingSafeEqual(
      Buffer.from(hashedOtp, "hex"),
      Buffer.from(storeOtp, "hex"),
    )
  ) {
    await redis.del(sessionKey);
    await redis.del(`otp:rate:${email}`);
    await redis.del(attemptsKey);
    return meta;
  }

  await redis.incr(attemptsKey);
  await redis.expire(attemptsKey, HOUR);

  return null;
};
