import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import config from "./config/index.js";
import logger from "./config/logger.js";
import { RedisClient } from "./config/redis.js";
import { notFoundMiddleware } from "./middleware/notFound.middleware.js";
import corsMiddleware from "./middleware/cors.middleware.js";
import reqLogger from "./middleware/req.middleware.js";
import errorHandler from "./middleware/error.middleware.js";
import routes from "./routes/index.js";

const app = express();

app.use(helmet());
app.use(corsMiddleware);
app.use(cookieParser());
app.use(express.json());

app.use(reqLogger);
if (config.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.get("/health", (req, res, next) => {
  res.status(200).json({
    message: "ok",
  });
});
app.use("/api", routes);
app.use(notFoundMiddleware);

app.use(errorHandler);
const startServer = async () => {
  try {
    app.listen(config.PORT, () => {
      logger.info(
        `${config.SERVICE_NAME} is listen at http://localhost:${config.PORT}`,
      );
    });
  } catch (error) {
    logger.info("failed to start server", error);
    process.exit(1);
  }
};

process.on("SIGINT", async () => {
  await RedisClient.disconnectRedis();
  process.exit(1);
});

process.on("SIGTERM", async () => {
  await RedisClient.disconnectRedis();
  process.exit(1);
});
startServer();
