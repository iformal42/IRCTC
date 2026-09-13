import AppError from "./../utils/error.js";
const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    err.statusCode = err.statusCode || 500;
    err.message = err.message || "Internal Server Error";

    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }
};

export default errorHandler;
