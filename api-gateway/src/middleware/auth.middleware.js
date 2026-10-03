import { verifyAccessToken } from "../utils/auth.js";
import { UnauthorizedError } from "../utils/error.js";

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer "))
    return next(new UnauthorizedError("Authorization token missing"));

  const authToken = authHeader.split(" ")[1];
  try {
    const payLoad = verifyAccessToken(authToken);
    req.user = payLoad;
  } catch (error) {
    return next(new UnauthorizedError("Invalide auth token!"));
  }
  next();
};
