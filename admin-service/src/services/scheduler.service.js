import logger from "../config/logger.js";
import prisma from "../config/prisma.js";
import adminProducer from "../kafka/producer/admin.producer.js";
import { BadRequestError, ConflictError } from "../utils/error.js";

const createSchedule = async (data) => {
  const { trainNumber, depatureDate } = data;
  const train = await prisma.train.findUnique({
    where: { trainNumber },
    include: {
      seats: true,
      route: {
        include: {
          routeStations: {
            include: { station: true },
            orderBy: { sequenceNumber: "asc" },
          },
        },
      },
    },
  });
  console.dir(train, { depth: null, colors: true });

  if (!train) {
    throw new ConflictError(`${trainNumber} train doesnt exits.`);
  }
  if (!train?.route) {
    throw new ConflictError(`${trainNumber} train does not have any route.`);
  }
  if (!train.route?.routeStations || train.route?.routeStations < 2) {
    throw new ConflictError(
      `${trainNumber} train has invalid route. Source and Destination not defined`,
    );
  }
  if (!train.seats || train.seats.length < 1) {
    throw new ConflictError(`${trainNumber} train doesnt contains any seats`);
  }
  const date = new Date(depatureDate);

  if (!date || isNaN(date.getTime())) {
    throw new BadRequestError(
      "Invalid date provided. Please provide DD/MM/YYYY format.",
    );
  }
  const trainId = train.id;
  const isAlreadySheduled = await prisma.schedule.findUnique({
    where: {
      trainId_departureDate: { trainId, departureDate: date },
    },
  });
  if (isAlreadySheduled) {
    throw new ConflictError(
      `${trainNumber} train is already schedule for ${depatureDate} date`,
    );
  }
  const { seats, route, ...trainDetails } = train;

  const schedule = await prisma.schedule.create({
    data: { trainId, departureDate: date },
  });
  const payLoad = {
    id: schedule.id,
    train: trainDetails,
    seats,
    route,
    schedule,
  };
  adminProducer.publishScheduleCreated(payLoad).catch((err) => {
    logger.error("Failed to publish create schedule into kafka", {
      error: err,
    });
  });
  return schedule;
};

export default { createSchedule };
