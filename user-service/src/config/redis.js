import Redis from "ioredis";
import config from "./index.js";
import logger from "./logger.js";
class RedisClient {
  static instance = null;
  static isConnected = false;
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

  setUpEventListeners() {
    RedisClient.instance.on("connect", () => {
      RedisClient.isConnected = true;
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
  }
}
