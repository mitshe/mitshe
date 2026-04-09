-- AlterTable
ALTER TABLE "agent_sessions" ADD COLUMN     "enable_docker" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "environments" ADD COLUMN     "enable_docker" BOOLEAN NOT NULL DEFAULT false;
