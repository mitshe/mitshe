"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Eye,
  EyeOff,
  Plus,
  Settings,
  Trash2,
  Check,
  Loader2,
  Zap,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Code2,
  FolderKanban,
  Copy,
  Link,
  RotateCcw,
  ChevronDown,
  BookOpen,
} from "lucide-react";
import {
  SlackIcon,
  DiscordIcon,
  TelegramIcon,
  TeamsIcon,
  GitHubIcon,
  GitLabIcon,
  JiraIcon,
  YouTrackIcon,
  LinearIcon,
  TrelloIcon,
  ObsidianIcon,
} from "@/components/icons/brand-icons";
import {
  useIntegrations,
  useCreateIntegration,
  useDeleteIntegration,
  useTestIntegration,
  useTestIntegrationBeforeConnect,
  useWebhookUrl,
  useRegenerateWebhookUrl,
} from "@/lib/api/hooks";
import { IntegrationCategory, type IntegrationType } from "@/lib/api/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface IntegrationDef {
  id: IntegrationType;
  category: IntegrationCategory;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  available: boolean;
  docsUrl?: string;
  fields: {
    key: string;
    label: string;
    placeholder: string;
    type: "text" | "password" | "url";
    required: boolean;
    helpText?: string;
  }[];
}

const integrationDefinitions: IntegrationDef[] = [
  {
    id: "SLACK",
    category: IntegrationCategory.COMMUNICATION,
    name: "Slack",
    description: "Send notifications to your team",
    icon: <SlackIcon />,
    color: "bg-[#4A154B]",
    available: true,
    docsUrl: "https://api.slack.com/authentication/token-types#bot",
    fields: [
      {
        key: "botToken",
        label: "Bot Token",
        placeholder: "xoxb-...",
        type: "password",
        required: true,
        helpText: "Create a Slack app and copy the Bot User OAuth Token",
      },
    ],
  },
  {
    id: "DISCORD",
    category: IntegrationCategory.COMMUNICATION,
    name: "Discord",
    description: "Send notifications to Discord channels",
    icon: <DiscordIcon />,
    color: "bg-[#5865F2]",
    available: true,
    docsUrl:
      "https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks",
    fields: [
      {
        key: "webhookUrl",
        label: "Webhook URL",
        placeholder: "https://discord.com/api/webhooks/...",
        type: "url",
        required: true,
        helpText: "Server Settings → Integrations → Webhooks → New Webhook",
      },
    ],
  },
  {
    id: "TELEGRAM",
    category: IntegrationCategory.COMMUNICATION,
    name: "Telegram",
    description: "Send messages via Telegram Bot",
    icon: <TelegramIcon />,
    color: "bg-[#0088CC]",
    available: true,
    docsUrl: "https://core.telegram.org/bots#how-do-i-create-a-bot",
    fields: [
      {
        key: "botToken",
        label: "Bot Token",
        placeholder: "123456789:ABCdefGHI...",
        type: "password",
        required: true,
        helpText: "Create a bot with @BotFather and copy the token",
      },
      {
        key: "defaultChatId",
        label: "Default Chat ID",
        placeholder: "-1001234567890",
        type: "text",
        required: false,
        helpText: "Optional: Default chat/group ID for messages",
      },
    ],
  },
  {
    id: "TEAMS",
    category: IntegrationCategory.COMMUNICATION,
    name: "Microsoft Teams",
    description: "Send notifications to Teams channels",
    icon: <TeamsIcon />,
    color: "bg-[#6264A7]",
    available: false,
    fields: [
      {
        key: "webhookUrl",
        label: "Webhook URL",
        placeholder: "https://...",
        type: "url",
        required: true,
      },
    ],
  },
  {
    id: "GITHUB",
    category: IntegrationCategory.DEVELOPMENT,
    name: "GitHub",
    description: "Sync repositories and manage code",
    icon: <GitHubIcon />,
    color: "bg-[#24292e]",
    available: true,
    docsUrl: "https://github.com/settings/tokens/new",
    fields: [
      {
        key: "accessToken",
        label: "Personal Access Token",
        placeholder: "ghp_... or github_pat_...",
        type: "password",
        required: true,
        helpText:
          "Fine-grained token with repository access. We'll sync all repos you grant access to.",
      },
    ],
  },
  {
    id: "GITLAB",
    category: IntegrationCategory.DEVELOPMENT,
    name: "GitLab",
    description: "Sync repositories and manage code",
    icon: <GitLabIcon />,
    color: "bg-[#FC6D26]",
    available: true,
    docsUrl:
      "https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html",
    fields: [
      {
        key: "baseUrl",
        label: "GitLab URL",
        placeholder: "https://gitlab.com",
        type: "url",
        required: true,
        helpText: "Use gitlab.com or your self-hosted instance URL",
      },
      {
        key: "accessToken",
        label: "Personal Access Token",
        placeholder: "glpat-...",
        type: "password",
        required: true,
        helpText:
          "Token with api scope. We'll sync all projects you have access to.",
      },
    ],
  },
  {
    id: "JIRA",
    category: IntegrationCategory.PROJECT,
    name: "Jira",
    description: "Import and sync tasks from Jira",
    icon: <JiraIcon />,
    color: "bg-[#0052CC]",
    available: true,
    docsUrl: "https://id.atlassian.com/manage-profile/security/api-tokens",
    fields: [
      {
        key: "baseUrl",
        label: "Jira URL",
        placeholder: "https://your-domain.atlassian.net",
        type: "url",
        required: true,
        helpText: "Your Jira Cloud instance URL",
      },
      {
        key: "email",
        label: "Email",
        placeholder: "user@example.com",
        type: "text",
        required: true,
        helpText: "Your Atlassian account email",
      },
      {
        key: "apiToken",
        label: "API Token",
        placeholder: "Your Jira API token",
        type: "password",
        required: true,
        helpText: "Generate from Atlassian account → Security → API tokens",
      },
    ],
  },
  {
    id: "TRELLO",
    category: IntegrationCategory.PROJECT,
    name: "Trello",
    description: "Sync cards and boards from Trello",
    icon: <TrelloIcon />,
    color: "bg-[#0079BF]",
    available: true,
    docsUrl: "https://trello.com/power-ups/admin",
    fields: [
      {
        key: "apiKey",
        label: "API Key",
        placeholder: "Your Trello API key",
        type: "password",
        required: true,
        helpText: "Get from trello.com/power-ups/admin → New → API Key",
      },
      {
        key: "apiToken",
        label: "API Token",
        placeholder: "Your Trello API token",
        type: "password",
        required: true,
        helpText: "Generate a token after creating your API key",
      },
    ],
  },
  {
    id: "YOUTRACK",
    category: IntegrationCategory.PROJECT,
    name: "YouTrack",
    description: "Sync with JetBrains YouTrack",
    icon: <YouTrackIcon />,
    color: "bg-[#7866FF]",
    available: true,
    docsUrl:
      "https://www.jetbrains.com/help/youtrack/cloud/Manage-Permanent-Token.html",
    fields: [
      {
        key: "baseUrl",
        label: "YouTrack URL",
        placeholder: "https://your-domain.youtrack.cloud",
        type: "url",
        required: true,
        helpText: "Your YouTrack Cloud or self-hosted instance URL",
      },
      {
        key: "token",
        label: "Permanent Token",
        placeholder: "perm:...",
        type: "password",
        required: true,
        helpText: "Generate from Profile → Account Security → Tokens",
      },
    ],
  },
  {
    id: "LINEAR",
    category: IntegrationCategory.PROJECT,
    name: "Linear",
    description: "Sync issues with Linear",
    icon: <LinearIcon />,
    color: "bg-[#5E6AD2]",
    available: true,
    docsUrl: "https://linear.app/settings/api",
    fields: [
      {
        key: "apiKey",
        label: "API Key",
        placeholder: "lin_api_...",
        type: "password",
        required: true,
        helpText: "Settings → Account → API → Personal API keys → New key",
      },
    ],
  },
  {
    id: "OBSIDIAN",
    category: IntegrationCategory.KNOWLEDGE,
    name: "Obsidian",
    description: "Search and create notes in your vault",
    icon: <ObsidianIcon />,
    color: "bg-[#7C3AED]",
    available: true,
    docsUrl: "https://coddingtonbear.github.io/obsidian-local-rest-api/",
    fields: [
      {
        key: "baseUrl",
        label: "API URL",
        placeholder: "https://127.0.0.1:27124",
        type: "url",
        required: true,
        helpText:
          "Local REST API plugin URL (default: https://127.0.0.1:27124)",
      },
      {
        key: "apiKey",
        label: "API Key",
        placeholder: "Your API key from the plugin",
        type: "password",
        required: true,
        helpText: "Copy from Obsidian → Settings → Local REST API → API Key",
      },
    ],
  },
];

const categoryInfo: Record<
  IntegrationCategory,
  { title: string; description: string; icon: React.ReactNode }
> = {
  [IntegrationCategory.COMMUNICATION]: {
    title: "Communication",
    description:
      "Connect messaging platforms to receive notifications and updates",
    icon: <MessageSquare className="w-5 h-5" />,
  },
  [IntegrationCategory.DEVELOPMENT]: {
    title: "Development",
    description: "Integrate with code repositories and development tools",
    icon: <Code2 className="w-5 h-5" />,
  },
  [IntegrationCategory.PROJECT]: {
    title: "Project Management",
    description: "Sync tasks and issues with your project management tools",
    icon: <FolderKanban className="w-5 h-5" />,
  },
  [IntegrationCategory.KNOWLEDGE]: {
    title: "Knowledge Base",
    description: "Connect your notes and documentation for AI context",
    icon: <BookOpen className="w-5 h-5" />,
  },
};

type TestStatus = "idle" | "testing" | "success" | "error";

export default function IntegrationsPage() {
  const { data: connectedIntegrations = [], isLoading } = useIntegrations();
  const { data: webhookData } = useWebhookUrl();
  const regenerateWebhookUrl = useRegenerateWebhookUrl();
  const createIntegration = useCreateIntegration();
  const deleteIntegration = useDeleteIntegration();
  const testIntegration = useTestIntegration();
  const testBeforeConnect = useTestIntegrationBeforeConnect();

  const [configureDialog, setConfigureDialog] = useState<IntegrationDef | null>(
    null,
  );
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [preConnectTest, setPreConnectTest] = useState<{
    status: TestStatus;
    message?: string;
  }>({ status: "idle" });

  const integrations = useMemo(() => {
    return integrationDefinitions.map((def) => {
      const connected = connectedIntegrations.find((c) => c.type === def.id);
      return {
        ...def,
        isConnected: !!connected,
        integrationId: connected?.id,
        status: connected?.status,
        lastSyncAt: connected?.lastSyncAt,
        errorMessage: connected?.errorMessage,
      };
    });
  }, [connectedIntegrations]);

  const openConfigDialog = (def: IntegrationDef) => {
    setConfigureDialog(def);
    setFormData({});
    setShowSecrets({});
    setPreConnectTest({ status: "idle" });
  };

  const handleTestBeforeConnect = async () => {
    if (!configureDialog) return;

    const missingFields = configureDialog.fields
      .filter((f) => f.required && !formData[f.key]?.trim())
      .map((f) => f.label);

    if (missingFields.length > 0) {
      toast.error(`Fill required fields first: ${missingFields.join(", ")}`);
      return;
    }

    setPreConnectTest({ status: "testing" });
    try {
      const result = await testBeforeConnect.mutateAsync({
        type: configureDialog.id,
        config: formData,
      });
      if (result.success) {
        setPreConnectTest({ status: "success", message: result.message });
      } else {
        setPreConnectTest({ status: "error", message: result.message });
      }
    } catch (error) {
      setPreConnectTest({
        status: "error",
        message:
          error instanceof Error ? error.message : "Connection test failed",
      });
    }
  };

  const handleConnect = async () => {
    if (!configureDialog) return;

    const missingFields = configureDialog.fields
      .filter((f) => f.required && !formData[f.key]?.trim())
      .map((f) => f.label);

    if (missingFields.length > 0) {
      toast.error(`Missing required fields: ${missingFields.join(", ")}`);
      return;
    }

    try {
      await createIntegration.mutateAsync({
        type: configureDialog.id,
        config: formData,
      });
      toast.success(`${configureDialog.name} connected successfully`);
      setConfigureDialog(null);
      setFormData({});
    } catch {
      toast.error(`Failed to connect ${configureDialog.name}`);
    }
  };

  const handleDisconnect = async (integrationId: string, name: string) => {
    try {
      await deleteIntegration.mutateAsync(integrationId);
      toast.success(`${name} disconnected`);
    } catch {
      toast.error("Failed to disconnect integration");
    }
  };

  const handleTest = async (integrationId: string, name: string) => {
    setTestingId(integrationId);
    try {
      const result = await testIntegration.mutateAsync(integrationId);
      if (result.success) {
        toast.success(`${name} connection verified!`, {
          description: result.message,
        });
      } else {
        toast.error(`${name} connection failed`, {
          description: result.message,
        });
      }
    } catch {
      toast.error(`Failed to test ${name} connection`);
    } finally {
      setTestingId(null);
    }
  };

  const groupedIntegrations: Record<IntegrationCategory, typeof integrations> =
    {
      [IntegrationCategory.COMMUNICATION]: integrations.filter(
        (i) => i.category === IntegrationCategory.COMMUNICATION,
      ),
      [IntegrationCategory.DEVELOPMENT]: integrations.filter(
        (i) => i.category === IntegrationCategory.DEVELOPMENT,
      ),
      [IntegrationCategory.PROJECT]: integrations.filter(
        (i) => i.category === IntegrationCategory.PROJECT,
      ),
      [IntegrationCategory.KNOWLEDGE]: integrations.filter(
        (i) => i.category === IntegrationCategory.KNOWLEDGE,
      ),
    };

  const connectedCount = integrations.filter((i) => i.isConnected).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 sm:p-6">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold">Integrations</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Connect external services to power your AI workflows and automate
          tasks.
        </p>
        {connectedCount > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {connectedCount} connected
            </Badge>
          </div>
        )}
      </div>

      {(Object.values(IntegrationCategory) as IntegrationCategory[]).map(
        (category) => (
          <div key={category} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                {categoryInfo[category].icon}
              </div>
              <div>
                <h2 className="text-lg font-semibold">
                  {categoryInfo[category].title}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {categoryInfo[category].description}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {groupedIntegrations[category].map((integration) => (
                <IntegrationRow
                  key={integration.id}
                  integration={integration}
                  onConfigure={() => openConfigDialog(integration)}
                  onDisconnect={() =>
                    integration.integrationId &&
                    handleDisconnect(
                      integration.integrationId,
                      integration.name,
                    )
                  }
                  onTest={() =>
                    integration.integrationId &&
                    handleTest(integration.integrationId, integration.name)
                  }
                  isDisconnecting={deleteIntegration.isPending}
                  isTesting={testingId === integration.integrationId}
                />
              ))}
            </div>
          </div>
        ),
      )}

      {webhookData && (
        <Collapsible className="border rounded-lg">
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full p-4 text-left hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
                  <Link className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium text-sm">Webhook URLs</p>
                  <p className="text-xs text-muted-foreground">
                    Configure incoming webhooks from external services
                  </p>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-3">
              <Separator />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Copy these URLs to your external services to receive events
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    try {
                      await regenerateWebhookUrl.mutateAsync();
                      toast.success("Webhook URLs regenerated");
                    } catch {
                      toast.error("Failed to regenerate");
                    }
                  }}
                  disabled={regenerateWebhookUrl.isPending}
                >
                  {regenerateWebhookUrl.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RotateCcw className="w-3 h-3" />
                  )}
                  <span className="ml-1.5">Regenerate</span>
                </Button>
              </div>
              <div className="space-y-2">
                <WebhookUrlRow
                  label="JIRA"
                  url={webhookData.urls.jira}
                  instructions="Settings → Webhooks"
                  docsUrl="https://developer.atlassian.com/cloud/jira/platform/webhooks/"
                />
                <WebhookUrlRow
                  label="GitLab"
                  url={webhookData.urls.gitlab}
                  instructions="Settings → Webhooks"
                  docsUrl="https://docs.gitlab.com/ee/user/project/integrations/webhooks.html"
                />
                <WebhookUrlRow
                  label="GitHub"
                  url={webhookData.urls.github}
                  instructions="Settings → Webhooks"
                  docsUrl="https://docs.github.com/en/webhooks"
                />
                <WebhookUrlRow
                  label="Trello"
                  url={webhookData.urls.trello}
                  instructions="Via API or Power-Up"
                  docsUrl="https://developer.atlassian.com/cloud/trello/guides/rest-api/webhooks/"
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      <Dialog
        open={!!configureDialog}
        onOpenChange={() => setConfigureDialog(null)}
      >
        <DialogContent className="max-w-full sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {configureDialog && (
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-lg text-white",
                    configureDialog.color,
                  )}
                >
                  {configureDialog.icon}
                </div>
              )}
              <div>
                <DialogTitle>Connect {configureDialog?.name}</DialogTitle>
                <DialogDescription>
                  Enter your credentials to connect
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <DialogBody className="space-y-4 py-4">
            {configureDialog?.fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key} className="flex items-center gap-1">
                  {field.label}
                  {field.required && (
                    <span className="text-destructive">*</span>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id={field.key}
                    type={
                      field.type === "password" && !showSecrets[field.key]
                        ? "password"
                        : "text"
                    }
                    placeholder={field.placeholder}
                    value={formData[field.key] || ""}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }));
                      if (preConnectTest.status !== "idle") {
                        setPreConnectTest({ status: "idle" });
                      }
                    }}
                    className="pr-10"
                  />
                  {field.type === "password" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full w-10"
                      onClick={() =>
                        setShowSecrets((prev) => ({
                          ...prev,
                          [field.key]: !prev[field.key],
                        }))
                      }
                    >
                      {showSecrets[field.key] ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
                {field.helpText && (
                  <p className="text-xs text-muted-foreground">
                    {field.helpText}
                  </p>
                )}
              </div>
            ))}

            {preConnectTest.status !== "idle" && (
              <Alert
                variant={
                  preConnectTest.status === "error" ? "destructive" : "default"
                }
                className={cn(
                  preConnectTest.status === "success" &&
                    "border-green-500 bg-green-50 dark:bg-green-950/20",
                )}
              >
                {preConnectTest.status === "testing" && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {preConnectTest.status === "success" && (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                )}
                {preConnectTest.status === "error" && (
                  <XCircle className="w-4 h-4" />
                )}
                <AlertDescription>
                  {preConnectTest.status === "testing"
                    ? "Testing connection..."
                    : preConnectTest.message}
                </AlertDescription>
              </Alert>
            )}

            {configureDialog?.docsUrl && (
              <a
                href={configureDialog.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                How to get credentials
              </a>
            )}

            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Check className="w-3 h-3" />
              Your credentials are encrypted and stored securely
            </p>
          </DialogBody>

          <DialogFooter className="gap-2 sm:gap-0">
            {preConnectTest.status !== "success" ? (
              <Button
                onClick={handleTestBeforeConnect}
                disabled={testBeforeConnect.isPending}
              >
                {testBeforeConnect.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                Test Connection
              </Button>
            ) : (
              <Button
                onClick={handleConnect}
                disabled={createIntegration.isPending}
              >
                {createIntegration.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Save & Connect
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IntegrationRow({
  integration,
  onConfigure,
  onDisconnect,
  onTest,
  isDisconnecting,
  isTesting,
}: {
  integration: IntegrationDef & {
    isConnected: boolean;
    integrationId?: string;
    status?: string;
    lastSyncAt?: string | null;
    errorMessage?: string | null;
  };
  onConfigure: () => void;
  onDisconnect: () => void;
  onTest: () => void;
  isDisconnecting: boolean;
  isTesting: boolean;
}) {
  const isError = integration.status === "ERROR";
  const isConnected = integration.status === "CONNECTED";

  return (
    <div
      className={cn(
        "flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border transition-colors",
        !integration.available && "opacity-50",
        integration.isConnected &&
          isError &&
          "border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/10",
        integration.isConnected &&
          isConnected &&
          "border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/10",
        !integration.isConnected &&
          integration.available &&
          "hover:bg-muted/50",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-md text-white shrink-0",
          integration.color,
        )}
      >
        {integration.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <span className="font-medium text-xs sm:text-sm">
            {integration.name}
          </span>
          {!integration.available && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              Soon
            </Badge>
          )}
          {isConnected && (
            <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-600" />
          )}
          {isError && (
            <XCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-500" />
          )}
        </div>
        {isError && integration.errorMessage && (
          <p className="text-[10px] sm:text-xs text-red-600 dark:text-red-400 truncate">
            {integration.errorMessage}
          </p>
        )}
        {!integration.isConnected && !isError && (
          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
            {integration.description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
        {integration.available && integration.isConnected ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={onTest}
              disabled={isTesting}
              className="h-7 w-7"
              title="Test"
            >
              {isTesting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onConfigure}
              className="h-7 w-7"
              title="Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDisconnect}
              disabled={isDisconnecting}
              className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
              title="Disconnect"
            >
              {isDisconnecting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
            </Button>
          </>
        ) : integration.available ? (
          <Button
            size="sm"
            variant="outline"
            onClick={onConfigure}
            className="h-7 text-[10px] sm:text-xs px-2 sm:px-3"
          >
            Connect
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function WebhookUrlRow({
  label,
  url,
  docsUrl,
}: {
  label: string;
  url: string;
  instructions?: string;
  docsUrl?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success(`${label} URL copied`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/30">
      <Badge
        variant="outline"
        className="w-12 sm:w-14 justify-center shrink-0 text-[10px] sm:text-xs"
      >
        {label}
      </Badge>
      <code className="flex-1 text-[10px] sm:text-xs font-mono break-all sm:truncate text-muted-foreground">
        {url}
      </code>
      {docsUrl && (
        <a
          href={docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          title="Documentation"
        >
          <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </a>
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        className="shrink-0 h-7 w-7"
      >
        {copied ? (
          <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-600" />
        ) : (
          <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        )}
      </Button>
    </div>
  );
}
