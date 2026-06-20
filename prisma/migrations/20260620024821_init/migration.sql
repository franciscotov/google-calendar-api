/*
  Warnings:

  - Added the required column `endsAt` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startsAt` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updateAt` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updateAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "endsAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "startsAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updateAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updateAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "Booking_startsAt_endsAt_idx" ON "Booking"("startsAt", "endsAt");
