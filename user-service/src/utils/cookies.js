import config from "../config/index.js";

export const setCookies = (res, key, payload, options = {}) => {
  res.cookie(key, payload, {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: "strict",
    ...options,
  });
};
