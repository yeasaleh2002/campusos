-- Campus calendar: special closures plus the bus-day rule (open and bus service Friday to Tuesday).

-- CreateTable
CREATE TABLE "CampusClosure" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "closesCampus" BOOLEAN NOT NULL DEFAULT true,
    "suspendsBus" BOOLEAN NOT NULL DEFAULT true,
    "note" VARCHAR(300),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampusClosure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CampusClosure_date_key" ON "CampusClosure"("date");
CREATE INDEX "CampusClosure_date_closesCampus_suspendsBus_idx" ON "CampusClosure"("date", "closesCampus", "suspendsBus");

-- AddForeignKey
ALTER TABLE "CampusClosure" ADD CONSTRAINT "CampusClosure_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Data fix (idempotent): trips that ran on the old Wednesday/Thursday schedule now run on every
-- service day. Wednesday (3) and Thursday (4) are removed and Friday (5) is added, then the
-- list is de-duplicated and sorted. A second run changes nothing because no 3 or 4 is left.
UPDATE "BusTrip"
SET "daysOfWeek" = ARRAY(
  SELECT DISTINCT d
  FROM unnest(array_append("daysOfWeek", 5)) AS d
  WHERE d NOT IN (3, 4)
  ORDER BY d
)
WHERE "daysOfWeek" && ARRAY[3, 4];

-- Trips can never be scheduled on a weekly off day (Wednesday = 3, Thursday = 4).
ALTER TABLE "BusTrip" ADD CONSTRAINT "BusTrip_no_off_days" CHECK (NOT ("daysOfWeek" && ARRAY[3, 4]));
