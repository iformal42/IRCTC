import { consumer } from "../../config/kafka.js";
import logger from "../../config/logger.js";
import emailService from "../../services/email.service.js";
import { TOPICS } from "../../utils/constants.js";

class EmailConsumer {
  constructor() {
    this.maxRetry = 3;
  }

  async start() {
    try {
      await consumer.connect();

      logger.info("Email consumer connected to kafka");

      await consumer.subscribe({
        topics: Object.values(TOPICS),
      });
      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const val = JSON.parse(message.value.toString());

            logger.info(`Processing message from topic: ${topic}`);
            await this.handleMessage(topic, val);
          } catch (error) {
            logger.error("Error processing message", {
              topic,
              error: error.message,
              stack: error.stack,
            });
          }
        },
      });
    } catch (error) {}
  }

  async handleMessage(topic, value) {
    switch (topic) {
      case TOPICS.OTP_EMAIL:
        await this.hanldeOtpEmail(value);
        break;
      case TOPICS.WELCOME_EMAIL:
        await this.hanldeWelcome(value);
        break;

      default:
        logger.error(`Unknown topic: ${topic}`);
        break;
    }
  }

  async hanldeOtpEmail(data) {
    const { email, otp, ttlMin } = data;
    if (!email || !otp) {
      throw new Error("Missing required data");
    }

    await emailService.sendOTPEmail({ email, otp });
    logger.info("Otp send successfull");
  }
  async hanldeWelcome(data) {
    const { email } = data;
    if (!email) {
      throw new Error("Missing required data");
    }

    await emailService.verifyOTPEmail({ email });
    logger.info("Welcome message send successfull");
  }
}

const emailConsumer = new EmailConsumer();

export { emailConsumer };
