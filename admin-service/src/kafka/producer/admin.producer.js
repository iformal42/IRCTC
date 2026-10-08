import { KAFKA_TOPICS } from "../../../../shared/constans/kafkaTopics.js";
import { connectProducer, producer } from "../../config/kafka.js";
import logger from "../../config/logger.js";

class AdminProducer {
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

  async publishStationCreated(stationData) {
    return this.sendMessage(
      KAFKA_TOPICS.CREATE_STATION,
      `station-${stationData.code}`,
      {
        eventType: "STATION_CREATED",
        data: stationData,
        timestamp: new Date().toISOString(),
      },
    );
  }
}

const adminProducer = new AdminProducer();
export default adminProducer;
