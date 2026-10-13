import catchAsync from "../../../shared/constans/catchAsync.js";
import schedulerService from "../services/scheduler.service.js";
import { BadRequestError } from "../utils/error.js";

export const createShcedule = catchAsync(async (req, res, next) => {
  const { trainNumber, depatureDate } = req.body;

  if (!trainNumber || !depatureDate) {
    throw new BadRequestError("Train number and depature date required");
  }

  const schedule = await schedulerService.createSchedule(
   { trainNumber,
    depatureDate}
  );

  res.status(201).json({
    sucess: true,
    message: "Train scheduled sucessesfully",
    data: schedule,
  });
});
