-- CreateTable
CREATE TABLE "environment_integrations" (
    "environment_id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,

    CONSTRAINT "environment_integrations_pkey" PRIMARY KEY ("environment_id","integration_id")
);

-- CreateTable
CREATE TABLE "session_integrations" (
    "session_id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,

    CONSTRAINT "session_integrations_pkey" PRIMARY KEY ("session_id","integration_id")
);

-- AddForeignKey
ALTER TABLE "environment_integrations" ADD CONSTRAINT "environment_integrations_environment_id_fkey" FOREIGN KEY ("environment_id") REFERENCES "environments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environment_integrations" ADD CONSTRAINT "environment_integrations_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_integrations" ADD CONSTRAINT "session_integrations_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "agent_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_integrations" ADD CONSTRAINT "session_integrations_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
