import { connectProducer, producer } from "../../config/kafka.js";
import logger from "../../config/logger.js";
import { TOPICS } from "../../utils/constants.js";

class NotificationProducer {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    await connectProducer();
    this.initialized = true;
  }

  async sendMessage(topic, key, value) {
    try {
      await this.initialize();

      const message = {
        topic,
        messages: [
          {
            key: key || `${topic}-${Date.now()}`,
            value: JSON.stringify(value),
            timeStamp: Date.now().toString(),
          },
        ],
      };

      const results = await producer.send(message);
      logger.info(`Message send to kafka topic:${topic}`, {
        key,
        partition: results[0].partition,
        offset: results[0].offset,
      });
      return results;
    } catch (error) {
      logger.error("Failed to send message in kafka of topic: " + topic, {
        error: error.message,
        stack: error.stack,
        key,
      });

      throw error;
    }
  }

  async sendOtpEmail(email, otp, ttlMin = 5) {
    return this.sendMessage(TOPICS.OTP_EMAIL, `otp-${email}`, {
      email,
      otp,
      ttlMin,
    });
  }
  async verifyOtpEmail(email) {
    return this.sendMessage(TOPICS.WELCOME_EMAIL, `welcome-${email}`, {
      email,
    });
  }
}

const notficationProducer = new NotificationProducer();
export default notficationProducer;
