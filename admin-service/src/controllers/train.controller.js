import catchAsync from "../../../shared/constans/catchAsync.js";
import trainService from "../services/train.service.js";
import { BadRequestError } from "../utils/error.js";

export const createTrain = catchAsync(async (req, res) => {
  if (!req.body) {
    throw new BadRequestError("Request body is required");
  }

  const { trainNumber, trainName, coachName, seats } = req.body;

  if (
    !trainNumber?.trim() ||
    !trainName?.trim() ||
    !coachName?.trim() ||
    !seats
  ) {
    throw new BadRequestError(
      " trainNumber,trainName ,seats and coachName not defined",
    );
  }
  if (!seats?.length) {
    throw new BadRequestError("A train atleast have one seat.. ");
  }
  const train = await trainService.createTrain({
    trainNumber,
    trainName,
    coachName,
    seats,
  });

  res.status(201).json({
    success: "true",
    message: "Train created",
    data: train,
  });
});

export const createRoute = catchAsync(async (req, res) => {
  const { trainNumber, stations } = req.body;

  if (!trainNumber || !stations || !Array.isArray(stations)) {
    throw new BadRequestError("Train number and stations array required");
  }

  if (stations.length < 2) {
    throw new BadRequestError("Source and destination required");
  }

  const routes = await trainService.createRoutes({ trainNumber, routes:stations });

  res.status(201).json({
    success: "true",
    message: "route created",
    data: routes,
  });
});
