import { Kafka, logLevel } from "kafkajs";
import config from "./index.js";
import logger from "./logger.js";
const GROUDID = "notification-service-group";
const kafka = new Kafka({
  clientId: config.KAFKA_CLIENT_ID,
  brokers: [config.KAFKA_BROKER],
  logLevel: logLevel.ERROR,
  retry: {
    initialRetryTime: 300,
    retries: 5,
    maxRetryTime: 30000,
  },
});

const consumer = kafka.consumer({
  groupId: GROUDID,
  sessionTimeout: 300000,
  heartbeatInterval: 3000,
});

let isConnected = false;

const connectConsumer = async () => {
  if (!isConnected) {
    await consumer.connect();
    isConnected = true;
    logger.info("Kafka producer connected");
  }
};

const disConnectConsumer = async () => {
  if (isConnected) {
    await consumer.disconnect();
    isConnected = false;
    logger.info("Kafka producer disconnected");
    process.exit(1);
  }
};

process.on("SIGTERM", disConnectConsumer);
process.on("SIGINT", disConnectConsumer);

export { kafka, consumer, connectConsumer, disConnectConsumer };
