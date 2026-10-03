import cors from "cors";
import config from "../config/index.js";

const allowedOrigins = config.ALLOW_ORIGIN.split(",").map((o) => o.trim());
const corsMiddleware = cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (!allowedOrigins.includes(origin)) {
      return callback(new Error("Not Allowed Origin"));
    }
    callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "Accept",
    "Content-Type",
    "Authorization",
    "X-Requested-With",
  ],
});
export default corsMiddleware;
