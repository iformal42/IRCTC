import logger from "../config/logger.js";
import prisma from "../config/prisma.js";
import adminProducer from "../kafka/producer/admin.producer.js";
import { BadRequestError, ConflictError } from "../utils/error.js";

const createTrain = async (data) => {
  const { trainNumber, trainName, coachName, seats } = data;

  const existingTrain = await prisma.train.findUnique({
    where: { trainNumber },
  });

  if (existingTrain) {
    throw new ConflictError(`Train number ${trainNumber} already exits`);
  }
  const seatNumbers = seats.map((seat) => seat.seatNumber);

  if (new Set(seatNumbers).size !== seatNumbers.length) {
    throw new BadRequestError("Duplicate seat number exits.");
  }
  const safeSeats = seats.map((seat) => {
    return {
      seatNumber: seat.seatNumber,
      seatType: seat.seatType,
      price: seat.price,
    };
  });

  const newTrain = await prisma.train.create({
    data: {
      trainNumber,
      trainName,
      coachName,
      totalSeats: seats.length,
      seats: {
        create: safeSeats,
      },
    },
    include: { seats: { orderBy: { seatNumber: "asc" } } },
  });

  adminProducer.publishTrainCreated(newTrain).catch((err) => {
    logger.error("Failed to published create train event", {
      error: err.message,
    });
  });

  return newTrain;
};

export const createRoutes = async (data) => {
  const { trainNumber, routes } = data;

  const train = await prisma.train.findUnique({
    where: { trainNumber },
  });

  if (!train) {
    throw new ConflictError(`Train with number ${trainNumber} doesnt exits`);
  }
  const existingRoutes = await prisma.route.findUnique({
    where: { trainId: train.id },
  });

  if (existingRoutes) {
    throw new ConflictError(
      `Routes already exits for ${trainNumber} train number`,
    );
  }
  const stationCodes = routes.map((r) => r.code);

  const stations = await prisma.station.findMany({
    where: { code: { in: stationCodes } },
  });

  if (stationCodes.length !== stations.length) {
    throw new BadRequestError("One ore more stations are invalid");
  }
  const stationIds = {};
  for (const s of stations) {
    stationIds[s.code] = s.id;
  }
  const sortedRoutes = [...routes].sort(
    (s1, s2) => s1.sequenceNumber - s2.sequenceNumber,
  );

  for (let i = 0; i < sortedRoutes.length; i++) {
    if (sortedRoutes[i].sequenceNumber !== i + 1) {
      throw new BadRequestError(
        "Sequence number must be continious starting from 1",
      );
    }
  }

  const newRoute = await prisma.route.create({
    data: {
      trainId: train.id,
      routeStations: {
        create: routes.map((s) => ({
          stationId: stationIds[s.code],
          sequenceNumber: s.sequenceNumber,
          arrivalTime: s.arrivalTime,
          departureTime: s.departureTime || null,
          distanceFromOrigin: s.distanceFromOrigin || 0,
        })),
      },
    },
    include: {
      routeStations: {
        include: { station: true },
        orderBy: { sequenceNumber: "asc" },
      },
    },
  });

  adminProducer.publishRouteCreated(newRoute).catch((err) => {
    logger.error("Failed to published create route event", {
      error: err.message,
    });
  });

  return newRoute;
};
export default { createTrain, createRoutes };
