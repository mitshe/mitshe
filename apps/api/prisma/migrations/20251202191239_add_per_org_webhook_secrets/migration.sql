-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "github_webhook_secret" BYTEA,
ADD COLUMN     "github_webhook_secret_iv" BYTEA,
ADD COLUMN     "gitlab_webhook_secret" BYTEA,
ADD COLUMN     "gitlab_webhook_secret_iv" BYTEA,
ADD COLUMN     "jira_webhook_secret" BYTEA,
ADD COLUMN     "jira_webhook_secret_iv" BYTEA;
