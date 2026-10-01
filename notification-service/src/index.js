import logger from "./config/logger.js";
import { emailConsumer } from "./kafka/consumer/email.consumer.js";

async function startNotificaionService(params) {
  try {
    logger.info("Notification service starting ...");

    // methomg
    await emailConsumer.start();

    logger.info("Notification service started success fully");
  } catch (error) {
    logger.error("Failed to Start Notification Services", {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection: ", { reason, promise });
});

process.on("uncaughtException", (error) => {
  logger.info("Uncaught Error: ", {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

startNotificaionService();
