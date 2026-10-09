import catchAsync from "../../../shared/constans/catchAsync.js";
import userService from "../services/user.service.js";
import { BadRequestError } from "../utils/error.js";

const getUserProfile = catchAsync(async (req, res) => {
  const userId = req?.user?.userId;
  if (!userId) {
    throw new BadRequestError("User ID is missing in the request");
  }

  const userProfile = await userService.getProfile(userId);

  res.status(200).json({
    status: "success",
    data: { userProfile },
  });
});

export { getUserProfile };
