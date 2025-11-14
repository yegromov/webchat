-- AlterTable
ALTER TABLE "users" ADD COLUMN "age" INTEGER NOT NULL DEFAULT 18,
ADD COLUMN "sex" TEXT NOT NULL DEFAULT 'M',
ADD COLUMN "country" TEXT NOT NULL DEFAULT 'Unknown';

-- Remove defaults after migration (optional, for new records)
ALTER TABLE "users" ALTER COLUMN "age" DROP DEFAULT,
ALTER COLUMN "sex" DROP DEFAULT,
ALTER COLUMN "country" DROP DEFAULT;
