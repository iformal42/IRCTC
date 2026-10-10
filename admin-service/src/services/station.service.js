import logger from "../config/logger.js";
import prisma from "../config/prisma.js";
import adminProducer from "../kafka/producer/admin.producer.js";
import { ConflictError } from "../utils/error.js";

const createStation = async (data) => {
  const { stationName, stationCode, stationState, stationCity } = data;

  const existingStation = await prisma.station.findUnique({
    where: { code: stationCode },
  });
  if (existingStation) {
    throw new ConflictError("Station code is already exits ");
  }

  const newStation = await prisma.station.create({
    data: {
      name: stationName,
      code: stationCode,
      city: stationState,
      state: stationCity,
    },
  });

  adminProducer.publishStationCreated(newStation).catch((err) => {
    logger.error("Failed to published create station event", {
      error: err.message,
    });
  });
  return newStation;
};

export default { createStation };
