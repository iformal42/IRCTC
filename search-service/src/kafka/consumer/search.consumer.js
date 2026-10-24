import { KAFKA_TOPICS } from "../../../../shared/constans/kafkaTopics.js";
import { connectConsumer, consumer } from "../../config/kafka.js";
import logger from "../../config/logger.js";
import searchService from "../../services/search.service.js";

class SearchConsumer {
  async start() {
    await connectConsumer();
    await consumer.subscribe({
      topics: [
        KAFKA_TOPICS.CREATE_ROUTE,
        KAFKA_TOPICS.CREATE_SCHEDULE,
        KAFKA_TOPICS.CREATE_STATION,
        KAFKA_TOPICS.CREATE_TRAIN,
      ],
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
            case KAFKA_TOPICS.CREATE_STATION:
              searchService.indexStation(value);
              break;
            case KAFKA_TOPICS.CREATE_ROUTE:
              searchService.indexTrainStation(value);
              break;
            case KAFKA_TOPICS.CREATE_SCHEDULE:
              searchService.indexSchedule(value);
              break;

            default:
              break;
          }
        } catch (error) {
          logger.error("Error in search consumer", { error });
        }
      },
    });
  }
}
const searchCosumer = new SearchConsumer();

export default searchCosumer;
