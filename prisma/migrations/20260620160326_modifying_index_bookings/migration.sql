-- DropIndex
DROP INDEX "Booking_startsAt_endsAt_idx";

-- CreateIndex
CREATE INDEX "Booking_userId_startsAt_idx" ON "Booking"("userId", "startsAt");
