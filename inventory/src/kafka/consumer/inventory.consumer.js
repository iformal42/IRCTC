import { KAFKA_TOPICS } from "../../../../shared/constans/kafkaTopics.js";
import { connectConsumer, consumer } from "../../config/kafka.js";
import logger from "../../config/logger.js";

class InventoryConsumer {
  async start() {
    await connectConsumer();
    await consumer.subscribe({
      topics: [KAFKA_TOPICS.CREATE_SCHEDULE],
      fromBeginning: true,
    });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const value = JSON.parse(message.value.toString());
          logger.info(`Processing ${topic}`, {
            partition,
            offset: message.offset,
          });

          switch (topic) {
            case KAFKA_TOPICS.CREATE_SCHEDULE:
              // searchService.indexSchedule(value);
              break;

            default:
              break;
          }
        } catch (error) {
          logger.error("Error in inventory consumer consumer", { error });
        }
      },
    });
  }
}
const inventoryCosumer = new InventoryConsumer();

export default inventoryCosumer;
