import { verifyAccessToken } from "../utils/auth";
import { UnauthorizedError } from "../utils/error";

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || authHeader.startsWith("Bearer "))
    return next(new UnauthorizedError("Authorization token missing"));

  const authToken = authHeader.split(" ")[1];
  try {
    const decoded = verifyAccessToken(authToken);
    req.user = decoded.payload;
  } catch (error) {
    return next(new UnauthorizedError("Invalide auth token!"));
  }
  next();
};
