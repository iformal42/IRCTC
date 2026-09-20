import jwt from "jsonwebtoken";
import config from "../config/index.js";

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
