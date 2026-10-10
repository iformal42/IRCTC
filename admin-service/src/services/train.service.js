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
export default { createTrain };
