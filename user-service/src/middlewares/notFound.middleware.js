import { NotFoundError } from "../utils/error.js";

export const notFoundMiddleware = (req, res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.path} not found`));
};
