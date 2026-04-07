-- AlterEnum
ALTER TYPE "IntegrationType" ADD VALUE 'TRELLO';

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN "trello_webhook_secret" BYTEA,
ADD COLUMN "trello_webhook_secret_iv" BYTEA;
