-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'LOGOUT', 'API_KEY_USED', 'CREATE', 'READ', 'UPDATE', 'DELETE', 'WORKFLOW_STARTED', 'WORKFLOW_COMPLETED', 'WORKFLOW_FAILED', 'INTEGRATION_CONNECTED', 'INTEGRATION_DISCONNECTED', 'INTEGRATION_ERROR', 'SETTINGS_CHANGED', 'MEMBER_INVITED', 'MEMBER_REMOVED', 'ROLE_CHANGED', 'EXPORT_DATA', 'IMPORT_DATA');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "IntegrationType" ADD VALUE 'DISCORD';
ALTER TYPE "IntegrationType" ADD VALUE 'TELEGRAM';

-- CreateTable
CREATE TABLE "node_executions" (
    "id" TEXT NOT NULL,
    "execution_id" TEXT NOT NULL,
    "node_id" TEXT NOT NULL,
    "node_name" TEXT,
    "node_type" TEXT,
    "status" TEXT NOT NULL,
    "output" JSONB,
    "error" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "duration_ms" INTEGER,

    CONSTRAINT "node_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT,
    "user_email" TEXT,
    "api_key_id" TEXT,
    "action" "AuditAction" NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "request_id" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "node_executions_execution_id_idx" ON "node_executions"("execution_id");

-- CreateIndex
CREATE INDEX "node_executions_execution_id_started_at_idx" ON "node_executions"("execution_id", "started_at");

-- CreateIndex
CREATE INDEX "node_executions_status_idx" ON "node_executions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "node_executions_execution_id_node_id_key" ON "node_executions"("execution_id", "node_id");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_created_at_idx" ON "audit_logs"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_resource_type_resource_id_idx" ON "audit_logs"("resource_type", "resource_id");

-- AddForeignKey
ALTER TABLE "node_executions" ADD CONSTRAINT "node_executions_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "workflow_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
