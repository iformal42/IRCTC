import { UnauthorizedError } from "../utils/error.js";

export const getUserContext = (req, res, next) => {
  const userId = req.headers["x-user-id"];
  if (!userId) {
    return next(
      new UnauthorizedError("User context is missing in the request"),
    );
  }
  req.user = { userId };
  next();
};
