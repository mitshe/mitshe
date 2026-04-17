-- CreateEnum
CREATE TYPE "SnapshotStatus" AS ENUM ('CREATING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "base_images" ADD COLUMN     "status" "SnapshotStatus" NOT NULL DEFAULT 'CREATING';
