import cors from "cors";
import config from "../config/index.js";
const corsMiddleware = cors({
  origin: config.ALLOW_ORIGIN.split(","),
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
