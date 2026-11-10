-- DropForeignKey
ALTER TABLE "saga_logs" DROP CONSTRAINT "saga_logs_bookingId_fkey";

-- AddForeignKey
ALTER TABLE "saga_logs" ADD CONSTRAINT "saga_logs_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
