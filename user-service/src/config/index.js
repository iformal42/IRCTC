import dotenv from "dotenv";
import packageJson from "./../../package.json" with { type: "json" };
dotenv.config();
const config = {
  SERVICE_NAME: packageJson.name,
  PORT: Number(process.env.PORT) || 4001,
  NODE_ENV: process.env.NODE_ENV,
  LOG_LEVEL: process.env.LOG_LEVEL,
  ALLOW_ORIGIN: process.env.ALLOW_ORIGIN,
  REDIS_URL: process.env.REDIS_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  RESEND_KEY: process.env.RESEND_KEY,
  OTP_TTL: Number(process.env.OTP_TTL) || 300,
  MAIL_FROM: process.env.MAIL_FROM,
  OTP_HMAC_SECRET: process.env.OTP_HMAC_SECRET,
  OTP_RATE_MAX_PER_HOUR: Number(process.env.OTP_RATE_MAX_PER_HOUR) || 5,
  OTP_MAX_VERIFY_ATTEMPTS: Number(process.env.OTP_MAX_VERIFY_ATTEMPTS) || 5,
};

export default config;
