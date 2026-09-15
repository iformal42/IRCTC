import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import config from "./config/index.js";
import errorHandler from "./middlewares/error.middleware.js";
import corsMiddleware from "./middlewares/cors.middleware.js";
import reqLogger from "./middlewares/req.middleware.js";
import logger from "./config/logger.js";
import authRouter from "./routes/auth.route.js";

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

app.use("/api/v1/auth", authRouter);

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
startServer();
