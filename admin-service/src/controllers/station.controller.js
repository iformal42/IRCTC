import catchAsync from "../../../shared/constans/catchAsync.js";
import stationService from "../services/station.service.js";
import { BadRequestError } from "../utils/error.js";

export const createStation = catchAsync(async (req, res) => {
  if (!req.body) {
    throw new BadRequestError("Request body is required");
  }
  const { stationName, stationCode, stationState, stationCity } = req.body;
  if (!stationName || !stationCode || !stationState || !stationCity) {
    throw new BadRequestError(
      "stationName, stationCode, stationState and stationCity are required",
    );
  }
  const station = await stationService.createStation({
    stationName: stationName.toUpperCase(),
    stationCode,
    stationState,
    stationCity,
  });
  res.status(201).json({
    success: true,
    message: "Station created successfully",
    data: station,
  });
});
