import { sendOTPEmail, verifyOTPEmail } from "../config/email.js";
import prisma from "../config/prisma.js";
import bcrypt from "bcrypt";
import { BadRequestError, ConflictError } from "../utils/error.js";
import { generateAndStoreOtp, validateOtp } from "../utils/otp.js";

const sendOtp = async ({ firstName, lastName, email, password }) => {
  const isUserExists = await prisma.user.findUnique({
    where: { email },
  });
  if (isUserExists) {
    throw new ConflictError("User already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const meta = { firstName, lastName, email, password: hashedPassword };
  const { otp, otpSessionId } = await generateAndStoreOtp(meta);
  await sendOTPEmail({ email, otp });
  return { otpSessionId };
};

const verifyOtp = async (otp, otpSessionId) => {
  const meta = await validateOtp(otp, otpSessionId);

  if (!meta) {
    throw new BadRequestError("Invalid or Expired otp", "OTP_INVALID");
  }
  const { firstName, lastName, password, email } = meta;
  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      password,
      email,
      emailVerified: true,
    },
  });

  await verifyOTPEmail({ email });

  return user;
};
export default { sendOtp, verifyOtp };
