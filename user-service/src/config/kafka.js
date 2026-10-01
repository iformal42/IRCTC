import { Kafka, logLevel } from "kafkajs";
import config from "./index.js";
import logger from "./logger.js";
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

const producer = kafka.producer({
  allowAutoTopicCreation: true,
  transactionTimeout: 300000,
  idempotent: true,
  maxInFlightRequests: 5,
  retry: {
    retries: 5,
  },
});

let isConnected = false;

const connectProducer = async () => {
  if (!isConnected) {
    await producer.connect();
    isConnected = true;
    logger.info("Kafka producer connected");
  }
};

const disConnectProducer = async () => {
  if (isConnected) {
    await producer.disconnect();
    isConnected = false;
    logger.info("Kafka producer disconnected");
  }
};

process.on("SIGTERM", disConnectProducer);
process.on("SIGINT", disConnectProducer);

export { kafka, producer, connectProducer, disConnectProducer };
