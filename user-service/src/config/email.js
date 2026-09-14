import { Resend } from "resend";
import config from "./index.js";

const resend = new Resend(config.RESEND_KEY);
const minutes = (config.OTP_TTL || 300) / 60;

async function sendOTPEmail({ email, otp }) {
  const message = `Your OTP is: ${otp}. It will expire in ${minutes} minutes.`;
  try {
    await resend.emails.send({
      from: config.MAIL_FROM,
      to: email,
      subject: "Your OTP",
      html: `<p>${message}</p>`,
    });
  } catch (error) {
    console.error("Error sending OTP email:", error);
    throw error;
  }
}

async function verifyOTPEmail({ email }) {
  const message = `Your OTP has been verified successfully.`;
  try {
    await resend.emails.send({
      from: config.MAIL_FROM,
      to: email,
      subject: "OTP Verified",
      html: `<p>${message}</p>`,
    });
  } catch (error) {
    console.error("Error sending OTP verification email:", error);
    throw error;
  }
}

export { sendOTPEmail, verifyOTPEmail };
