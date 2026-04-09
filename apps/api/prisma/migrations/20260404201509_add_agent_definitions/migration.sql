-- AlterTable
ALTER TABLE "agent_sessions" ADD COLUMN     "agent_definition_id" TEXT,
ADD COLUMN     "start_arguments" TEXT;

-- CreateTable
CREATE TABLE "agent_definitions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ai_credential_id" TEXT,
    "start_arguments" TEXT,
    "instructions" TEXT NOT NULL DEFAULT '',
    "max_session_duration_ms" INTEGER,
    "default_project_id" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_definition_repositories" (
    "agent_definition_id" TEXT NOT NULL,
    "repository_id" TEXT NOT NULL,

    CONSTRAINT "agent_definition_repositories_pkey" PRIMARY KEY ("agent_definition_id","repository_id")
);

-- CreateIndex
CREATE INDEX "agent_definitions_organization_id_idx" ON "agent_definitions"("organization_id");

-- AddForeignKey
ALTER TABLE "agent_definitions" ADD CONSTRAINT "agent_definitions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_definitions" ADD CONSTRAINT "agent_definitions_ai_credential_id_fkey" FOREIGN KEY ("ai_credential_id") REFERENCES "ai_credentials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_definitions" ADD CONSTRAINT "agent_definitions_default_project_id_fkey" FOREIGN KEY ("default_project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_definition_repositories" ADD CONSTRAINT "agent_definition_repositories_agent_definition_id_fkey" FOREIGN KEY ("agent_definition_id") REFERENCES "agent_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_definition_repositories" ADD CONSTRAINT "agent_definition_repositories_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_agent_definition_id_fkey" FOREIGN KEY ("agent_definition_id") REFERENCES "agent_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
