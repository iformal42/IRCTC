import catchAsync from "../../../shared/constans/catchAsync";
import { BadRequestError } from "../utils/error.js";

export const createBooking = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const {
    scheduleId,
    seatIds,
    passengers,
    idempotencyKey,
    fromStationId,
    toStationId,
    fromSeq,
    toSeq,
  } = req.body;

  if (!scheduleId || !seatIds || !passengers || !idempotencyKey) {
    throw new BadRequestError(
      "Missing required fields: scheduleId, seatIds, passengers, idempotencyKey",
    );
  }

  const result = await bookingService.createBooking({
    scheduleId,
    seatIds,
    passengers,
    idempotencyKey,
    userId,
    fromStationId,
    toStationId,
    fromSeq,
    toSeq,
  });

  res.status(201).json({
    success: true,
    message: "Booking created successfully",
    data: result,
  });
});
