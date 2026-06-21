-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "googleEventId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "googleCalendarId" TEXT,
ADD COLUMN     "name" TEXT;
