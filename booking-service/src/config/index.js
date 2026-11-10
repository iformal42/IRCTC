import dotenv from "dotenv";
import packageJson from "./../../package.json" with { type: "json" };
dotenv.config();
const config = {
  SERVICE_NAME: packageJson.name,
  PORT: Number(process.env.PORT) || 4005,
  NODE_ENV: process.env.NODE_ENV,
  LOG_LEVEL: process.env.LOG_LEVEL,
  ALLOW_ORIGIN: process.env.ALLOW_ORIGIN,
  DATABASE_URL: process.env.DATABASE_URL,
  KAFKA_CLIENT_ID: process.env.KAFKA_CLIENT_ID,
  KAFKA_BROKER: process.env.KAFKA_BROKER,
  REDIS_URL: process.env.REDIS_URL,
  BOOKING_TTL_SECONDS: process.env.BOOKING_TTL_SECONDS,
  BOOKING_EXPIRY_CHECK_INTERVAL_MS:
    process.env.BOOKING_EXPIRY_CHECK_INTERVAL_MS,
  LOCK_TTL_SECONDS: process.env.LOCK_TTL_SECONDS,
};

export default config;
