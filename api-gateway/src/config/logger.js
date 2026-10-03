import config from "./index.js";
import winston from "winston";

const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  defaultMeta: { service: config.SERVICE_NAME },
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(
      ({ level, message, timestamp, service }) =>
        `[${timestamp}] [${level}] [${service}]: ${message}`,
    ),
  ),
  transports: [new winston.transports.Console()],
});

export default logger;
