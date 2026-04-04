"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Plus,
  Trash2,
  Loader2,
  Bot,
  Star,
  Eye,
  EyeOff,
  Shield,
  Zap,
  PlugZap,
} from "lucide-react";
import {
  AnthropicIcon,
  OpenAIIcon,
  OpenRouterIcon,
  GoogleIcon,
  GroqIcon,
} from "@/components/icons/brand-icons";
import { OpenClawIcon } from "@/components/icons/openclaw-icon";
import {
  useAICredentials,
  useCreateAICredential,
  useUpdateAICredential,
  useDeleteAICredential,
  useTestAICredential,
  useTestAICredentialBeforeConnect,
} from "@/lib/api/hooks";
import { toast } from "sonner";
import { AIProvider } from "@/lib/api/types";

const providerConfig: Record<
  AIProvider,
  { name: string; description: string; icon: React.ReactNode; color: string }
> = {
  CLAUDE: {
    name: "Claude (Anthropic)",
    description: "Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku",
    icon: <AnthropicIcon />,
    color: "bg-[#D97757]",
  },
  OPENAI: {
    name: "OpenAI",
    description: "GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo",
    icon: <OpenAIIcon />,
    color: "bg-[#412991]",
  },
  OPENROUTER: {
    name: "OpenRouter",
    description: "Access 100+ AI models through one API",
    icon: <OpenRouterIcon />,
    color: "bg-[#6366F1]",
  },
  GEMINI: {
    name: "Gemini (Google)",
    description: "Gemini Pro, Gemini Ultra, Gemini Flash",
    icon: <GoogleIcon />,
    color: "bg-[#4285F4]",
  },
  GROQ: {
    name: "Groq",
    description: "Ultra-fast inference with LLaMA, Mixtral",
    icon: <GroqIcon />,
    color: "bg-[#F55036]",
  },
  CLAUDE_CODE_LOCAL: {
    name: "Claude Code (Local)",
    description: "Local Claude Code instance for development",
    icon: <AnthropicIcon />,
    color: "bg-[#D97757]",
  },
  OPENCLAW: {
    name: "OpenClaw",
    description: "Open-source AI agent platform with 50+ providers",
    icon: <OpenClawIcon />,
    color: "bg-[#10B981]",
  },
};

export default function AICredentialsPage() {
  const { data: credentials = [], isLoading } = useAICredentials();
  const createCredential = useCreateAICredential();
  const updateCredential = useUpdateAICredential();
  const deleteCredential = useDeleteAICredential();

  const testCredential = useTestAICredential();
  const testBeforeConnect = useTestAICredentialBeforeConnect();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [addForm, setAddForm] = useState({
    provider: "" as AIProvider | "",
    apiKey: "",
    isDefault: false,
  });

  const isLocalProvider =
    addForm.provider === "CLAUDE_CODE_LOCAL" ||
    addForm.provider === "OPENCLAW";

  const handleTestConnection = async (id: string) => {
    try {
      const result = await testCredential.mutateAsync(id);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Failed to test connection");
    }
  };

  const handleAddCredential = async () => {
    if (!addForm.provider) {
      toast.error("Please select a provider");
      return;
    }

    if (!isLocalProvider && !addForm.apiKey) {
      toast.error("Please enter your API key");
      return;
    }

    try {
      const testResult = await testBeforeConnect.mutateAsync({
        provider: addForm.provider as AIProvider,
        apiKey: isLocalProvider ? undefined : addForm.apiKey,
      });

      if (!testResult.success) {
        toast.error(`Connection test failed: ${testResult.message}`);
        return;
      }

      await createCredential.mutateAsync({
        provider: addForm.provider as AIProvider,
        apiKey: isLocalProvider ? "local" : addForm.apiKey,
        isDefault: addForm.isDefault,
      });
      toast.success("AI credential added successfully");
      setIsAddOpen(false);
      setAddForm({ provider: "", apiKey: "", isDefault: false });
      setShowApiKey(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to add credential";
      toast.error(message);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await updateCredential.mutateAsync({
        id,
        data: { isDefault: true },
      });
      toast.success("Default provider updated");
    } catch {
      toast.error("Failed to update default provider");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCredential.mutateAsync(id);
      toast.success("AI credential deleted");
    } catch {
      toast.error("Failed to delete credential");
    }
  };

  const availableProviders = (
    Object.keys(providerConfig) as AIProvider[]
  ).filter((provider) => !credentials.some((c) => c.provider === provider));

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Providers</h1>
          <p className="text-muted-foreground">
            Manage API keys for AI providers used in workflows
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button disabled={availableProviders.length === 0}>
              <Plus className="w-4 h-4 mr-2" />
              Add Provider
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add AI Provider</DialogTitle>
              <DialogDescription>
                Connect an AI provider to use in your workflows
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select
                  value={addForm.provider}
                  onValueChange={(value: AIProvider) =>
                    setAddForm({ ...addForm, provider: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProviders.map((provider) => (
                      <SelectItem key={provider} value={provider}>
                        <div className="flex items-center gap-2">
                          {providerConfig[provider].icon}
                          {providerConfig[provider].name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {addForm.provider && (
                <Alert>
                  <Shield className="w-4 h-4" />
                  <AlertDescription>
                    {providerConfig[addForm.provider as AIProvider].description}
                  </AlertDescription>
                </Alert>
              )}

              {isLocalProvider ? (
                <Alert>
                  <Zap className="w-4 h-4" />
                  <AlertDescription>
                    No API key required. This provider manages its own
                    authentication - configure it in a Workspace session.
                    Supported only in Workspace sessions, not in Workflows.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <div className="relative">
                    <Input
                      id="apiKey"
                      type={showApiKey ? "text" : "password"}
                      value={addForm.apiKey}
                      onChange={(e) =>
                        setAddForm({ ...addForm, apiKey: e.target.value })
                      }
                      placeholder="sk-..."
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your API key will be encrypted and stored securely
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Checkbox
                  id="isDefault"
                  checked={addForm.isDefault}
                  onCheckedChange={(checked) =>
                    setAddForm({ ...addForm, isDefault: checked === true })
                  }
                />
                <Label htmlFor="isDefault" className="cursor-pointer text-sm">
                  Set as default provider
                </Label>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddCredential}
                disabled={
                  createCredential.isPending ||
                  testBeforeConnect.isPending ||
                  !addForm.provider ||
                  (!isLocalProvider && !addForm.apiKey)
                }
              >
                {(createCredential.isPending ||
                  testBeforeConnect.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {testBeforeConnect.isPending ? "Testing..." : "Add Provider"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : credentials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border rounded-lg">
          <Bot className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No AI Providers</h3>
          <p className="text-muted-foreground text-center mb-4">
            Add an AI provider to enable AI-powered features in your workflows
          </p>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Provider
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {credentials.map((credential) => {
            const config = providerConfig[credential.provider];
            return (
              <div
                key={credential.id}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div
                  className={`w-8 h-8 rounded-md ${config.color} flex items-center justify-center text-white shrink-0`}
                >
                  {config.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{config.name}</span>
                    {credential.isDefault && (
                      <Badge
                        variant="default"
                        className="text-[10px] px-1.5 py-0 gap-0.5"
                      >
                        <Star className="w-2.5 h-2.5" />
                        Default
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{credential.usageCount.toLocaleString()} calls</span>
                    {credential.maskedKey && (
                      <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">
                        {credential.maskedKey}
                      </code>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!credential.isDefault && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSetDefault(credential.id)}
                      disabled={updateCredential.isPending}
                      className="h-7 w-7"
                      title="Set as default"
                    >
                      <Star className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleTestConnection(credential.id)}
                    disabled={testCredential.isPending}
                    className="h-7 w-7"
                    title="Test connection"
                  >
                    {testCredential.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <PlugZap className="w-3.5 h-3.5" />
                    )}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={deleteCredential.isPending}
                        className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete AI Provider</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {config.name}?
                          Workflows using this provider will stop working.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(credential.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
