import catchAsync from "../../../shared/constans/catchAsync.js";
import searchService from "../services/search.service.js";
import { BadRequestError } from "../utils/error.js";

export const searchStation = catchAsync(async (req, res) => {
  const { from, to, date = null } = req.query;

  if (!from || !to) {
    throw new BadRequestError(
      "Missing Either or All Source or Destination  are  not Provided ",
    );
  }

  const results = await searchService.searchStations({ from, to, date });

  res.status(200).json({
    success: true,
    data: results,
  });
});

export const autoComplete = catchAsync(async (req, res) => {
  const { station } = req.query;

  if (!station || station.length < 2)
    throw new BadRequestError("Provide atleast 2 characters");

  const suggestions = await searchService.autoCompleteStation(station);
  res.status(200).json({
    success: true,
    data: suggestions,
  });
});
