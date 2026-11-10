import config from "../config/index.js";
import logger from "../config/logger.js";
import prisma from "../config/prisma.js";
import {
  acquireSeatLocks,
  releaseSeatLocks,
} from "../utils/distributedLock.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../utils/error.js";

const generateCreateBookingIdempotencyKey = (idempotencyKey) =>
  `booking-${idempotencyKey}`;

const saveIdempotency = async (key, response) => {
  await prisma.idempotencyRecord.create({
    data: { eventKey: key, response },
  });
};

const checkBookingIdempotency = async (key) => {
  const exits = await prisma.idempotencyRecord.findUnique({
    where: {
      eventKey: key,
    },
  });
  if (exits) {
    logger.info(`Idempotent request:${key}`);
    return exits.response;
  }
  return null;
};
export const createBooking = async (data) => {
  const {
    scheduleId,
    seatIds,
    passengers,
    idempotencyKey,
    userId,
    fromStationId,
    toStationId,
    fromSeq,
    toSeq,
  } = data;
  if (
    !scheduleId ||
    !seatIds ||
    Array.isArray(seatIds) ||
    seatIds.length === 0
  ) {
    throw new BadRequestError("Invalid or missing scheduleId or seatIds");
  }

  if (!passengers || !Array.isArray(passengers) || passengers.length === 0) {
    throw new BadRequestError("Invalid or missing passengers");
  }

  if (seatIds.length !== passengers.length) {
    throw new BadRequestError("Number of seatIds and passengers must match");
  }
  if (!idempotencyKey) {
    throw new BadRequestError("Missing idempotencyKey");
  }
  if (fromSeq && toSeq && fromSeq >= toSeq) {
    throw new BadRequestError("Invalid fromSeq and toSeq values");
  }
  const bookingIdempotencyKey =
    generateCreateBookingIdempotencyKey(idempotencyKey);
  const cache = checkBookingIdempotency(bookingIdempotencyKey);

  if (cache) {
    return cache;
  }
  let booking;
  const sortedSeats = seatIds.toSorted();

  try {
    const availability =
      await inventoryClinet.checkSeatAvailability(scheduleId);

    if (availability.status !== "ACTIVE") {
      throw new BadRequestError(
        `Schedule ${scheduleId} is not active for booking`,
      );
    }
    const depatureDate = availability.departureDate;
    if (new Date(depatureDate) < new Date()) {
      throw new BadRequestError(
        `Schedule ${scheduleId} has already departed on ${depatureDate}`,
      );
    }
    const seatData = await inventoryClinet.getSeatDetails(scheduleId, {
      fromSeq,
      toSeq,
    });

    const seatMap = new Map(seatData.seats.map((seat) => [seat.seatId, seat]));

    const bookingSeats = [];
    const totalAmount = 0;
    let lockVal;

    for (const seatId of seatIds) {
      const seat = seatMap.get(seatId);
      if (!seat) {
        throw new NotFoundError(
          `Seat ${seatId} is not available for schedule ${scheduleId}`,
        );
      }

      const isAvailable =
        fromSeq && toSeq && !seat.segmentStatus
          ? seat.segmentStatus === "AVAILABLE"
          : seat.status === "AVAILABLE";

      if (!isAvailable) {
        throw new ConflictError(
          `Seat ${seat.seatNumber} is not available for booking in schedule ${scheduleId}`,
          "SEAT_UNAVAILABLE",
        );
      }

      bookingSeats.push(seat);
      totalAmount += seat.price;
    }

    const { acquired, lockValue } = await acquireSeatLocks(
      scheduleId,
      sortedSeats,
      `pre-${Date.now()}`,
      config.BOOKING_TTL_SECONDS,
      fromSeq,
      toSeq,
    );
    lockVal = lockValue;
    if (!acquired) {
      throw new ConflictError(
        "One or more seats are being booked by another user. ",
        "SEATS LOCKED",
      );
    }

    // 5. Create booking record in DB
    const lockExpiresAt = new Date(
      Date.now() + config.BOOKING_TTL_SECONDS * 1000,
    );

    booking = await prisma.booking.create({
      data: {
        userId,
        scheduleId,
        trainId: availability.trainId,
        trainNumber: availability.trainNumber,
        trainName: availability.trainName,
        departureDate: new Date(availability.departureDate),
        status: "PENDING",
        totalAmount,
        seatCount: seatIds.length,
        fromStationId: fromStationId || null, // --- SEGMENT BOOKING
        toStationId: toStationId || null, // --- SEGMENT BOOKING
        fromSeq: fromSeq || null, // --- SEGMENT BOOKING
        toSeq: toSeq || null, // --- SEGMENT BOOKING
        idempotencyKey,
        lockExpiresAt,
        seats: {
          create: bookingSeats.map((seat, index) => ({
            seatId: seat.seatId,
            seatNumber: seat.seatNumber,
            seatType: seat.seatType,
            price: seat.price,
          })),
        },
        passengers: {
          create: passengers.map((p, index) => ({
            name: p.name,
            age: p.age,
            gender: p.gender,
            seatId: seatIds[index] || null, // use original order to match user's intended seat assignment
          })),
        },
      },
      include: { seats: true, passengers: true },
    });

    // TODO
    await saga.executeHoldSeats({
      booking,
      sortedSeats,
      ttl: config.LOCK_TTL_SECONDS,
      fromSeq,
      toSeq,
    });

    const paymentOrder = await saga.executeCreatePayment(booking);

    booking = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: { seats: true, passengers: true },
    });
    const response = {
      bookingId: booking.id,
      status: booking.status,
      totalAmount: booking.totalAmount,
      lockExpiresAt: booking.lockExpiresAt,
      seats: booking.seats.map((s) => ({
        seatId: s.seatId,
        seatNumber: s.seatNumber,
        seatType: s.seatType,
        price: s.price,
      })),
      passengers: booking.passengers.map((p) => ({
        name: p.name,
        age: p.age,
        gender: p.gender,
      })),
      paymentOrder: {
        paymentOrderId: paymentOrder.paymentOrderId,
        gatewayOrderId: paymentOrder.gatewayOrderId,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        keyId: paymentOrder.keyId,
      },
    };

    await saveIdempotency(`booking:${idempotencyKey}`, response);
    return response;
  } catch (error) {
    logger.error(
      `Booking creation failed for user ${userId}: ${error.message}`,
    );

    if (booking) {
      await saga.compensateAll(booking.id, sortedSeats);
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: "FAILED",
          failureResponce: error?.response?.data?.message || error.message,
        },
      });
    }
    await releaseSeatLocks(scheduleId, seatIds, lockVal, fromSeq, toSeq);

    throw error;
  }
};
