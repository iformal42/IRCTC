import jwt from "jsonwebtoken";
import config from "../config/index.js";
import { redis } from "../config/redis.js";

export const generateAccessToken = (userId) => {
  const payLoad = {
    userId,
  };

  return jwt.sign(payLoad, config.JWT_ACCESS_SECRECT, {
    expiresIn: `${config.ACCESS_TOKEN_EXP}min`,
  });
};

export const generateRefreshToken = (userId) => {
  const jti = crypto.randomUUID();
  const payLoad = {
    userId,
    jti,
  };

  const refreshToken = jwt.sign(payLoad, config.JWT_REFRESH_SECRECT, {
    expiresIn: `${config.REFRESH_TOKEN_EXP}d`,
  });

  return { jti, refreshToken };
};

export const verifyAccessToken = (token) =>
  jwt.verify(token, config.JWT_ACCESS_SECRECT);

export const verifyRefreshToken = (token) =>
  jwt.verify(token, config.JWT_REFRESH_SECRECT);

export const createAndStoreToken = async (user, deviceId) => {
  const userId = user.id;
  const accessToken = generateAccessToken(userId);
  const { jti, refreshToken } = generateRefreshToken(userId);

  await redis.set(
    `refresh:${userId}:${deviceId}`,
    jti,
    "EX",
    config.REFRESH_TOKEN_EXP * 24 * 60 * 60,
  );
  const { password: _password, ...safeUser } = user;
  await redis.set(
    `user:${userId}:`,
    JSON.stringify(safeUser),
    "EX",
    config.REDIS_USER_TTL,
  );

  return { accessToken, refreshToken, safeUser };
};
