import Redis from "ioredis";
import config from "./index.js";
import logger from "./logger.js";
class RedisClient {
  static instance = null;
  static isConnected = false;
  constructor() {}
  static getInstance() {
    if (!RedisClient.instance) {
      RedisClient.instance = new Redis(config.REDIS_URL, {
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
      });
      RedisClient.setUpEventListeners();
    }
    return RedisClient.instance;
  }

  static setUpEventListeners() {
    RedisClient.instance.on("connecting", () => {
      logger.info("Redis is connecting..");
    });
    RedisClient.instance.on("connect", () => {
      logger.info("Redis connected");
    });

    RedisClient.instance.on("error", (err) => {
      RedisClient.isConnected = false;
      logger.error("Redis error:", err);
    });

    RedisClient.instance.on("close", () => {
      RedisClient.isConnected = false;
      logger.warn("Redis connection closed");
    });
    RedisClient.instance.on("reconnecting", () => {
      logger.warn("Redis reconnecting...");
    });

    RedisClient.instance.on("ready", () => {
      RedisClient.isConnected = true;

      logger.warn("Redis client is ready");
    });

    RedisClient.instance.on("end", () => {
      RedisClient.isConnected = false;
      logger.warn("Redis connection ended");
    });
  }
}
const redis = RedisClient.getInstance();
export { redis };
