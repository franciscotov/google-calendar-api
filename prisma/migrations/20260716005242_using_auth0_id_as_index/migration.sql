/*
  Warnings:

  - You are about to drop the column `userId` on the `Booking` table. All the data in the column will be lost.
  - Added the required column `userAuth0Id` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_userId_fkey";

-- DropIndex
DROP INDEX "Booking_userId_startsAt_idx";

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "userId",
ADD COLUMN     "userAuth0Id" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Booking_userAuth0Id_startsAt_idx" ON "Booking"("userAuth0Id", "startsAt");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userAuth0Id_fkey" FOREIGN KEY ("userAuth0Id") REFERENCES "User"("auth0Id") ON DELETE RESTRICT ON UPDATE CASCADE;
