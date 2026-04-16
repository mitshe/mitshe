"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  useChatConversations,
  useChatConversation,
  useCreateChatConversation,
  useDeleteChatConversation,
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
  MessageSquarePlus,
  Send,
  Trash2,
  Loader2,
  Bot,
  User,
  Wrench,
  ChevronDown,
  ChevronRight,
  KeyRound,
  AlertCircle,
} from "lucide-react";
import type { ChatToolCall } from "@mitshe/types";

export default function ChatPage() {
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [inputValue, setInputValue] = useState("");
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading: loadingConversations } =
    useChatConversations();
  const { data: activeConversation, isLoading: loadingConversation } =
    useChatConversation(activeConversationId || "");
  const { data: credentials = [], isLoading: loadingCredentials } =
    useAICredentials();
  const createConversation = useCreateChatConversation();
  const deleteConversation = useDeleteChatConversation();
  const sendMessage = useSendChatMessage();

  const hasCredentials = credentials.length > 0;
  const messages = activeConversation?.messages || [];
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);

  // Auto-select first credential
  useEffect(() => {
    if (credentials.length > 0 && !selectedCredentialId) {
      const defaultCred = credentials.find((c: any) => c.isDefault) || credentials[0];
      setSelectedCredentialId(defaultCred.id);
    }
  }, [credentials, selectedCredentialId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sendMessage.isPending, pendingUserMessage]);

  const handleNewConversation = async () => {
    if (!selectedCredentialId) return;
    setErrorMessage(null);
    const conversation = await createConversation.mutateAsync({
      aiCredentialId: selectedCredentialId,
    });
    setActiveConversationId(conversation.id);
  };

  const handleSend = async () => {
    if (!inputValue.trim() || !activeConversationId || sendMessage.isPending)
      return;

    setErrorMessage(null);
    const content = inputValue;
    setInputValue("");
    setPendingUserMessage(content);

    try {
      await sendMessage.mutateAsync({
        conversationId: activeConversationId,
        data: { content },
      });
    } catch (err: any) {
      const backendMsg = err?.data?.message;
      const msg = backendMsg || err?.message || "Something went wrong. Please try again.";
      const cleanMsg = msg.includes("ENCRYPTION_KEY") || msg.includes("Unsupported state")
        ? "Your AI provider key could not be loaded. Please go to Settings → AI Providers, remove the key and add it again."
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

  // No AI provider configured — show setup screen
  if (!loadingCredentials && !hasCredentials) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <KeyRound className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">Set up an AI provider</h2>
          <p className="text-sm text-muted-foreground">
            To start chatting, you need to connect an AI provider. Add your API
            key for Claude, OpenAI, OpenRouter, or another supported provider.
          </p>
          <Button asChild>
            <Link href="/settings/ai">Go to AI Providers</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 border-r border-border flex flex-col bg-muted/30">
        <div className="p-3 border-b border-border flex items-center gap-2">
          <Select
            value={selectedCredentialId}
            onValueChange={setSelectedCredentialId}
          >
            <SelectTrigger className="flex-1 h-8 text-xs">
              <SelectValue placeholder="Select AI provider" />
            </SelectTrigger>
            <SelectContent>
              {credentials.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.provider}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={handleNewConversation}
            disabled={createConversation.isPending || !selectedCredentialId}
            title="New conversation"
          >
            {createConversation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageSquarePlus className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConversations ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No conversations yet.
            </div>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                className={`group flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors ${
                  activeConversationId === c.id ? "bg-muted" : ""
                }`}
                onClick={() => {
                  setActiveConversationId(c.id);
                  setErrorMessage(null);
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">
                    {c.title || "New conversation"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(c.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation.mutate(c.id);
                    if (activeConversationId === c.id) {
                      setActiveConversationId(null);
                    }
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col">
        {!activeConversationId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md">
              <Bot className="h-12 w-12 mx-auto text-muted-foreground" />
              <h2 className="text-lg font-medium">mitshe AI Assistant</h2>
              <p className="text-sm text-muted-foreground">
                Create workflows, manage sessions, track tasks — all through
                natural language.
              </p>
              <div className="flex flex-wrap gap-2 justify-center text-xs text-muted-foreground">
                <span className="border rounded-full px-3 py-1">
                  &ldquo;List my repositories&rdquo;
                </span>
                <span className="border rounded-full px-3 py-1">
                  &ldquo;Create a workflow for PR reviews&rdquo;
                </span>
                <span className="border rounded-full px-3 py-1">
                  &ldquo;Start a new session&rdquo;
                </span>
              </div>
              <Button
                onClick={handleNewConversation}
                disabled={!selectedCredentialId}
              >
                <MessageSquarePlus className="h-4 w-4 mr-2" />
                New Conversation
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingConversation ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 && !sendMessage.isPending ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground">
                    Send a message to get started.
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <ChatMessageBubble
                    key={msg.id}
                    role={msg.role}
                    content={msg.content}
                    toolUse={msg.toolUse as ChatToolCall[] | null}
                  />
                ))
              )}

              {pendingUserMessage && (
                <ChatMessageBubble
                  role="user"
                  content={pendingUserMessage}
                  toolUse={null}
                />
              )}

              {sendMessage.isPending && (
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Thinking...
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  </div>
                  <div className="rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2 text-sm text-destructive max-w-lg">
                    {errorMessage}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border p-4">
              <div className="flex gap-2">
                <Textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message... (Cmd+Enter to send)"
                  className="min-h-[60px] max-h-[200px] resize-none"
                  rows={2}
                  disabled={sendMessage.isPending}
                />
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || sendMessage.isPending}
                  className="shrink-0 self-end"
                >
                  {sendMessage.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ChatMessageBubble({
  role,
  content,
  toolUse,
}: {
  role: string;
  content: string;
  toolUse: ChatToolCall[] | null;
}) {
  const isUser = role === "user";

  return (
    <div
      className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
          isUser ? "bg-foreground/10" : "bg-primary/10"
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4 text-primary" />
        )}
      </div>
      <div className={`flex-1 space-y-2 min-w-0 ${isUser ? "text-right" : ""}`}>
        {content && (
          <div
            className={`inline-block rounded-lg px-3 py-2 text-sm whitespace-pre-wrap max-w-[80%] ${
              isUser ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            {content}
          </div>
        )}
        {toolUse && toolUse.length > 0 && (
          <div className="space-y-1">
            {toolUse.map((tool, i) => (
              <ToolCallCard key={i} toolCall={tool} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ToolCallCard({ toolCall }: { toolCall: ChatToolCall }) {
  const [expanded, setExpanded] = useState(false);

  const label = toolCall.name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  const resultMessage =
    toolCall.result?.message || toolCall.result?.id
      ? String(toolCall.result.message || `ID: ${toolCall.result.id}`)
      : null;

  return (
    <div className="border border-border rounded-md overflow-hidden text-left max-w-[80%]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors"
      >
        <Wrench className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="font-medium truncate">{label}</span>
        {resultMessage && (
          <span className="text-muted-foreground truncate ml-1">
            — {resultMessage}
          </span>
        )}
        <span className="ml-auto shrink-0">
          {expanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </span>
      </button>
      {expanded && (
        <div className="px-3 py-2 border-t border-border bg-muted/30 text-xs font-mono">
          <div className="space-y-2">
            <div>
              <span className="text-muted-foreground font-sans">Input:</span>
              <pre className="mt-0.5 whitespace-pre-wrap break-all">
                {JSON.stringify(toolCall.input, null, 2)}
              </pre>
            </div>
            <div>
              <span className="text-muted-foreground font-sans">Result:</span>
              <pre className="mt-0.5 whitespace-pre-wrap break-all">
                {JSON.stringify(toolCall.result, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
