import dotenv from "dotenv";
import packageJson from "./../../package.json" with { type: "json" };
dotenv.config();
const config = {
  SERVICE_NAME: packageJson.name,
  NODE_ENV: process.env.NODE_ENV,
  LOG_LEVEL: process.env.LOG_LEVEL,
  RESEND_KEY: process.env.RESEND_KEY,
  OTP_TTL: Number(process.env.OTP_TTL) || 300,
  MAIL_FROM: process.env.MAIL_FROM,
  KAFKA_CLIENT_ID: process.env.KAFKA_CLIENT_ID,
  KAFKA_BROKER: process.env.KAFKA_BROKER,
};

export default config;
