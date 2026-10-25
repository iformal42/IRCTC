import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import config from "./config/index.js";
import errorHandler from "./middlewares/error.middleware.js";
import corsMiddleware from "./middlewares/cors.middleware.js";
import reqLogger from "./middlewares/req.middleware.js";
import logger from "./config/logger.js";
import { notFoundMiddleware } from "./middlewares/notFound.middleware.js";
import { initIndices } from "./config/elasticsSearch.js";
import searchCosumer from "./kafka/consumer/search.consumer.js";
import searchRouter from "./routes/search.route.js";

const app = express();

app.use(helmet());
app.use(corsMiddleware);
app.use(reqLogger);
app.use(cookieParser());
app.use(express.json());

app.get("/", (req, res, next) => {
  res.send("heelo ");
});
app.get("/health", (req, res, next) => {
  res.status(200).json({
    message: "ok",
  });
});

app.use("/api/v1/search", searchRouter);
app.use(notFoundMiddleware);
app.use(errorHandler);
const startServer = async () => {
  try {
    app.listen(config.PORT, () => {
      logger.info(
        `${config.SERVICE_NAME} is listen at http://localhost:${config.PORT}`,
      );
    });
    await initIndices();
    await searchCosumer.start();
  } catch (error) {
    logger.info("failed to start server", error);
    process.exit(1);
  }
};

process.on("SIGINT", async () => {
  process.exit(1);
});

process.on("SIGTERM", async () => {
  process.exit(1);
});
startServer();
