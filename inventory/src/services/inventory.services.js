import logger from "../config/logger.js";
import prisma from "../config/prisma.js";
import inventoryProducer from "../kafka/producer/inventory.producer.js";

const createSheduleEventKey = (sheduleId) => `SHEDULEP_CREATE:${sheduleId}`;
const cancelSheduleEventKey = (sheduleId) => `SHEDULEP_CANCEL:${sheduleId}`;
const initializeInventory = async (scheduleEvent) => {
  console.dir(scheduleEvent, { depth: null, colors: true });
  const { id, train, seats, schedule, route } = scheduleEvent.data;
  const scheduleId = id;
  const trainId = train.id;
  const { departureDate, status } = schedule;
  const totalSeats = seats ? seats.length : 0;

  if (!scheduleId || !totalSeats) {
    logger.error(
      `Invalid schedule event data: ${JSON.stringify(scheduleEvent.data)}`,
    );
    return;
  }

  const eventKey = createSheduleEventKey(scheduleId);

  const idempotencyCheck = await prisma.idempotencyRecord.findUnique({
    where: { eventKey },
  });

  if (idempotencyCheck) {
    logger.info(
      `Idempotency check passed for schedule ${scheduleId}. Skipping inventory initialization.`,
    );
    return;
  }

  await prisma.$transaction(async (tx) => {
    const schedule = await tx.scheduleInventory.create({
      data: {
        scheduleId,
        trainId,
        trainNumber: train.trainNumber,
        trainName: train.trainName,
        departureDate: new Date(departureDate),
        status: "ACTIVE",
        available: totalSeats,
        totalSeats,
        locked: 0,
        booked: 0,
      },
    });

    const seatData = seats.map((seat) => ({
      scheduleInventoryId: schedule.id,
      scheduleId,
      seatId: seat.id,
      seatType: seat.seatType,
      seatNumber: seat.seatNumber,
      price: seat.price,
      status: "AVAILABLE",
    }));

    await tx.seatInventory.createMany({
      data: seatData,
    });

    if (route && route.length > 0) {
      const routeStopData = route.map((routeStation) => ({
        scheduleId,
        stationId: routeStation.stationId,
        stationName: routeStation.station.name,
        stationCode: routeStation.station.code,
        sequenceNumber: routeStation.sequenceNumber,
      }));
      await tx.scheduleRoute.createMany({
        data: routeStopData,
      });
    }

    await tx.idempotencyRecord.create({
      data: { eventKey },
    });
  });
  logger.info(
    `Inventory initialized for schedule ${scheduleId} with ${totalSeats} seats.`,
  );
  await inventoryProducer
    .publishSeatAvailabiltyUpdated({
      scheduleId,
      trainId,
      availableSeats: totalSeats,
      locked: 0,
      booked: 0,
    })
    .catch((error) => {
      logger.error(
        `Failed to publish seat availability update for schedule ${scheduleId}`,
        { error },
      );
    });
};
export const canIScheduleInventory = async (scheduleCancelData) => {
  const { id, train, seats, schedule } = scheduleCancelData;
  const scheduleId = id;
  if (!scheduleId) {
    logger.error(
      `Invalid schedule cancel data: ${JSON.stringify(scheduleCancelData)}`,
    );
    return;
  }
  const eventKey = cancelSheduleEventKey(scheduleId);
  const idempotencyCheck = await prisma.idempotencyRecord.findUnique({
    where: { eventKey },
  });

  if (idempotencyCheck) {
    logger.info(
      `Idempotency check passed for schedule ${scheduleId}. Skipping inventory cancellation.`,
    );
    return;
  }
  const scheduleInventory = await prisma.scheduleInventory.findUnique({
    where: { scheduleId },
  });

  if (!scheduleInventory) {
    logger.error(
      `No inventory found for schedule ${scheduleId}. Cannot cancel inventory.`,
    );
    return;
  }
  await prisma.$transaction(async (tx) => {
    await tx.scheduleInventory.update({
      where: { scheduleId },
      data: {
        status: "CANCELLED",
        availableSeats: 0,
        locked: 0,
        booked: 0,
        version: { increment: 1 },
      },
    });

    await tx.seatInventory.updateMany({
      where: { scheduleId },
      data: {
        status: "CANCELLED",
      },
    });

    await tx.idempotencyRecord.create({
      data: { eventKey },
    });
  });

  logger.info(`Inventory cancelled for schedule ${scheduleId}.`);
  await inventoryProducer
    .publishSeatAvailabiltyUpdated({
      scheduleId,
      trainId: train.id,
      availableSeats: 0,
      locked: 0,
      booked: 0,
    })
    .catch((error) => {
      logger.error(
        `Failed to publish seat availability update for cancelled schedule ${scheduleId}`,
        { error },
      );
    });
};

export const inventoryService = {
  initializeInventory,
  canIScheduleInventory,
};
