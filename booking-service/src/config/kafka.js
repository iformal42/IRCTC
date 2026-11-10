import { Kafka, logLevel } from "kafkajs";
import config from "./index.js";
import logger from "./logger.js";
const GROUDID = "inventory-service-group";
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
const consumer = kafka.consumer({
  groupId: GROUDID,
  sessionTimeout: 300000,
  heartbeatInterval: 3000,
});

let isConsumerConnected = false;
let isProducerConnected = false;

const connectConsumer = async () => {
  if (!isConsumerConnected) {
    await consumer.connect();
    isConsumerConnected = true;
    logger.info("Kafka consumer connected");
  }
};

const disConnectConsumer = async () => {
  if (isConsumerConnected) {
    await consumer.disconnect();
    isConsumerConnected = false;
    logger.info("Kafka consumer disconnected");
    process.exit(1);
  }
};

const connectProducer = async () => {
  if (!isProducerConnected) {
    await producer.connect();
    isProducerConnected = true;
    logger.info("Kafka producer connected");
  }
};

const disConnectProducer = async () => {
  if (isProducerConnected) {
    await producer.disconnect();
    isProducerConnected = false;
    logger.info("Kafka producer disconnected");
  }
};

process.on("SIGTERM", () => {
  disConnectProducer();
  disConnectConsumer();
});
process.on("SIGINT", () => {
  disConnectProducer();
  disConnectConsumer();
});

export {
  kafka,
  producer,
  connectProducer,
  disConnectProducer,
  consumer,
  connectConsumer,
  disConnectConsumer,
};
