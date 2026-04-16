"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  useChatConversations,
  useChatConversation,
  useCreateChatConversation,
  useSendChatMessage,
  useAICredentials,
} from "@/lib/api/hooks";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Send,
  Loader2,
  KeyRound,
  AlertCircle,
  Zap,
  Workflow,
  Terminal,
  ListTodo,
  GitBranch,
  Plug,
  Check,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatToolCall } from "@mitshe/types";

export default function ChatPage() {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: conversations = [] } = useChatConversations();
  const { data: activeConversation, isLoading: loadingConversation } =
    useChatConversation(activeConversationId || "");
  const { data: credentials = [], isLoading: loadingCredentials } = useAICredentials();
  const createConversation = useCreateChatConversation();
  const sendMessage = useSendChatMessage();

  const hasCredentials = credentials.length > 0;
  const messages = activeConversation?.messages || [];

  useEffect(() => {
    if (credentials.length > 0 && !selectedCredentialId) {
      const defaultCred = credentials.find((c: any) => c.isDefault) || credentials[0];
      setSelectedCredentialId(defaultCred.id);
    }
  }, [credentials, selectedCredentialId]);

  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
    }
  }, [conversations, activeConversationId]);

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      setActiveConversationId(e.detail.conversationId);
      setErrorMessage(null);
    };
    window.addEventListener("chat:select" as any, handler);
    return () => window.removeEventListener("chat:select" as any, handler);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sendMessage.isPending, pendingUserMessage]);

  const handleSend = async () => {
    if (!inputValue.trim() || sendMessage.isPending) return;

    let convId = activeConversationId;
    if (!convId) {
      if (!selectedCredentialId) return;
      const conversation = await createConversation.mutateAsync({
        aiCredentialId: selectedCredentialId,
      });
      convId = conversation.id;
      setActiveConversationId(convId);
    }

    setErrorMessage(null);
    const content = inputValue;
    setInputValue("");
    setPendingUserMessage(content);
    if (textareaRef.current) textareaRef.current.style.height = "48px";

    try {
      await sendMessage.mutateAsync({ conversationId: convId, data: { content } });
    } catch (err: any) {
      const backendMsg = err?.data?.message;
      const msg = backendMsg || err?.message || "Something went wrong.";
      const cleanMsg =
        msg.includes("ENCRYPTION_KEY") || msg.includes("Unsupported state")
          ? "AI provider key could not be loaded. Re-add it in Settings \u2192 AI Providers."
          : msg;
      setErrorMessage(cleanMsg);
    } finally {
      setPendingUserMessage(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!loadingCredentials && !hasCredentials) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <KeyRound className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">Set up an AI provider</h2>
          <p className="text-sm text-muted-foreground">
            Add your API key for Claude, OpenAI, OpenRouter, or another provider to start chatting.
          </p>
          <Button asChild>
            <Link href="/settings/ai">Go to AI Providers</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {(!activeConversationId || (messages.length === 0 && !loadingConversation)) && !pendingUserMessage ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-8 max-w-xl px-4">
            <div>
              <Sparkles className="h-8 w-8 mx-auto mb-4 text-primary" />
              <h2 className="text-2xl font-semibold">What can I help with?</h2>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                "List my repositories",
                "Create a workflow",
                "Show running sessions",
                "Create a new task",
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setInputValue(prompt)}
                  className="text-left px-4 py-3 rounded-xl border border-border hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {loadingConversation ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  toolUse={msg.toolUse as ChatToolCall[] | null}
                />
              ))
            )}

            {pendingUserMessage && (
              <ChatMessage role="user" content={pendingUserMessage} toolUse={null} />
            )}

            {sendMessage.isPending && (
              <div className="flex gap-4">
                <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5 animate-pulse" />
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            )}

            {errorMessage && (
              <div className="flex gap-4">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="rounded-xl bg-destructive/5 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                  {errorMessage}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="p-4 pb-6">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-border bg-muted/30 focus-within:border-primary/50 transition-colors overflow-hidden">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                // Auto-resize
                const el = e.target;
                el.style.height = "0";
                el.style.height = Math.min(el.scrollHeight, 200) + "px";
              }}
              onKeyDown={handleKeyDown}
              placeholder="Reply..."
              className="w-full min-h-[48px] max-h-[200px] resize-none text-sm bg-transparent px-4 pt-3.5 pb-1 outline-none placeholder:text-muted-foreground overflow-y-auto"
              rows={1}
              disabled={sendMessage.isPending}
            />
            <div className="flex items-center justify-between px-3 pb-2.5">
              <Select value={selectedCredentialId} onValueChange={setSelectedCredentialId}>
                <SelectTrigger className="h-7 w-auto gap-1.5 border-0 bg-transparent text-xs text-muted-foreground hover:text-foreground px-1.5 shadow-none focus:ring-0">
                  <SelectValue placeholder="Provider" />
                </SelectTrigger>
                <SelectContent>
                  {credentials.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.provider}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleSend}
                disabled={!inputValue.trim() || sendMessage.isPending || !selectedCredentialId}
                className="h-7 w-7 rounded-lg"
              >
                {sendMessage.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Chat message ─── */

function ChatMessage({
  role,
  content,
  toolUse,
}: {
  role: string;
  content: string;
  toolUse: ChatToolCall[] | null;
}) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="rounded-2xl bg-primary text-primary-foreground px-4 py-2.5 text-sm max-w-[75%] whitespace-pre-wrap">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      <Sparkles className="h-5 w-5 text-primary shrink-0 mt-1" />
      <div className="flex-1 min-w-0 space-y-3">
        {toolUse && toolUse.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {toolUse.map((tool, i) => (
              <ToolChip key={i} toolCall={tool} />
            ))}
          </div>
        )}
        {content && (
          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-pre:my-3 prose-code:before:content-none prose-code:after:content-none prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-normal prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Tool chip ─── */

const TOOL_META: Record<string, { icon: React.ReactNode; color: string; basePath: string }> = {
  session: { icon: <Terminal className="h-3 w-3" />, color: "text-emerald-500", basePath: "/sessions" },
  workflow: { icon: <Workflow className="h-3 w-3" />, color: "text-blue-500", basePath: "/workflows" },
  task: { icon: <ListTodo className="h-3 w-3" />, color: "text-amber-500", basePath: "/tasks" },
  repository: { icon: <GitBranch className="h-3 w-3" />, color: "text-purple-500", basePath: "/settings/repositories" },
  integration: { icon: <Plug className="h-3 w-3" />, color: "text-cyan-500", basePath: "/settings/integrations" },
};

function ToolChip({ toolCall }: { toolCall: ChatToolCall }) {
  const prefix = toolCall.name.split("_")[0];
  const meta = TOOL_META[prefix] || { icon: <Zap className="h-3 w-3" />, color: "text-muted-foreground", basePath: "" };
  const action = toolCall.name.replace(/^[^_]+_/, "").replace(/_/g, " ");
  const resultMsg = toolCall.result?.message
    ? String(toolCall.result.message)
    : toolCall.result?.name
      ? String(toolCall.result.name)
      : null;

  // Build link to the created/affected resource
  const resourceId = toolCall.result?.id as string | undefined;
  const href = resourceId && meta.basePath ? `${meta.basePath}/${resourceId}` : null;

  const chip = (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full bg-muted/80 border border-border/50 px-2.5 py-1 text-xs transition-colors",
      href && "hover:bg-muted hover:border-border cursor-pointer",
    )}>
      <span className={meta.color}>{meta.icon}</span>
      <span className="font-medium capitalize">{action}</span>
      {resultMsg && (
        <>
          <span className="text-muted-foreground/50">&middot;</span>
          <span className="text-muted-foreground truncate max-w-[200px]">{resultMsg}</span>
        </>
      )}
      {href ? (
        <ExternalLink className="h-3 w-3 text-muted-foreground" />
      ) : (
        <Check className="h-3 w-3 text-emerald-500" />
      )}
    </span>
  );

  if (href) {
    return <Link href={href}>{chip}</Link>;
  }

  return chip;
}
