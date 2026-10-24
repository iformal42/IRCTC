import config from "./index.js";
import logger from "./logger.js";
import { Client } from "@elastic/elasticsearch";

const esClient = new Client({ node: config.ELASTICSEARCH_URL });

const STATION_INDEX = "station";
const TRAIN_INDEX = "train";
const SHEDULE_INDEX = "schedule";
const ROUTE_INDEX = "route";
export const createStationIndex = async () => {
  const stationExits = await esClient.indices.exists({ index: STATION_INDEX });

  if (stationExits) return;
  await esClient.indices.create({
    index: STATION_INDEX,
    settings: {
      analysis: {
        analyzer: {
          autocomplete_analyzer: {
            type: "custom",
            tokenizer: "autocomplete_tokenizer",
            filter: ["lowercase"],
          },
          search_analyzer: {
            type: "custom",
            tokenizer: "standard",
            filter: ["lowercase"],
          },
        },
        tokenizer: {
          autocomplete_tokenizer: {
            type: "edge_ngram",
            min_gram: 2,
            max_gram: 20,
            token_chars: ["letter", "digit"],
          },
        },
      },
    },
    mappings: {
      properties: {
        stationId: { type: "keyword" },
        name: {
          type: "text",
          analyzer: "autocomplete_analyzer",
          search_analyzer: "search_analyzer",
        },
        code: { type: "keyword" },
        city: {
          type: "text",
          analyzer: "autocomplete_analyzer",
          search_analyzer: "search_analyzer",
        },
        suggest: { type: "completion" },
      },
    },
  });
};

export const createTrainIndex = async () => {
  const trainExits = await esClient.indices.exists({ index: TRAIN_INDEX });
  if (trainExits) return;
  await esClient.indices.create({
    index: TRAIN_INDEX,
    mappings: {
      properties: {
        trainId: { type: "keyword" },
        trainNumber: { type: "keyword" },
        trainName: { type: "text" },
        route: {
          type: "nested",
          properties: {
            stationId: { type: "keyword" },
            stationName: { type: "text" },
            stationCode: { type: "keyword" },
            sequenceNumber: { type: "integer" },
            arrivalTime: { type: "keyword" },
            depatureTime: { type: "keyword" },
            distanceFromOrigin: { type: "float" },
          },
        },
        schedule: {
          type: "nested",
          properties: {
            scheduleId: { type: "keyword" },
            departureDate: { type: "date" },
            status: { type: "keyword" },
            available: { type: "integer" },
            locked: { type: "integer" },
            booked: { type: "integer" },
          },
        },
        seatSummary: {
          properties: {
            total: { type: "integer" },
            LOWER: { type: "integer" },
            MIDDLE: { type: "integer" },
            UPPER: { type: "integer" },
            SIDE_LOWER: { type: "integer" },
            SIDE_UPPER: { type: "integer" },
          },
        },
      },
    },
  });
};
const initIndices = async () => {
  await createStationIndex();
  await createTrainIndex();
  logger.info("Train index created");
};

export {
  esClient,
  initIndices,
  SHEDULE_INDEX,
  STATION_INDEX,
  ROUTE_INDEX,
  TRAIN_INDEX,
};
