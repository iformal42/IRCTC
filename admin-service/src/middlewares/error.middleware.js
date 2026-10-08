import logger from "../config/logger.js";
import { AppErorr } from "../utils/error.js";

const errorHandler = (err, req, res, next) => {
  if (err instanceof AppErorr) {
    err.statusCode = err.statusCode || 500;
    err.message = err.message || "Internal Server Error";

    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    logger.error("Uncaught Error:", err);
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
};

export default errorHandler;
