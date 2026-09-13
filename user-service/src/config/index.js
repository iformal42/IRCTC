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
};

export default config;
