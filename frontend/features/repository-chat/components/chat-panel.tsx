"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Cpu, Sparkles, Loader2, MessageSquarePlus, History, Pencil, Trash2, Check, X } from "lucide-react";
import ChatMessageList from "./chat-message-list";
import ChatInput from "./chat-input";
import { useRepositoryChat } from "@/features/repository-chat/hooks/use-repository-chat";

interface ChatPanelProps {
  repositoryName?: string;
}

function ChatPanelContent({ repositoryName = "default" }: ChatPanelProps) {
  const searchParams = useSearchParams();
  const urlAsk = searchParams.get("ask") || searchParams.get("query") || "";

  const {
    messages,
    input,
    isLoading,
    selectedProvider,
    selectedModel,
    availableProviders,
    setSelectedProvider,
    setSelectedModel,
    setInput,
    sendMessage,
    regenerateMessage,
    clearConversation,
    sessionId,
    sessions,
    isLoadingSessions,
    loadSession,
    renameSession,
    deleteSession,
  } = useRepositoryChat({ repositoryName, initialQuestion: urlAsk });

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const currentProviderObj = availableProviders.find(
    (p) => p.id.toLowerCase() === selectedProvider.toLowerCase()
  );

  const handleHintClick = (hint: string) => {
    if (isLoading) return;
    sendMessage(hint);
  };

  return (
    <div className="flex h-full w-full flex-col gap-4">
      {/* Chat header strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 px-4 py-3">
        {/* Left: Product title / New Chat / History */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5">
              Knowledge Assistant
            </Badge>

            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearConversation()}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
                title="Start a new conversation"
              >
                <MessageSquarePlus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">New Chat</span>
              </Button>
            )}

            <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
              <SheetTrigger>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
                  title="View conversation history"
                >
                  <History className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">History</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-full sm:max-w-md flex flex-col p-0 bg-background">
                <SheetHeader className="p-6 pb-4 border-b">
                  <SheetTitle>Conversation History</SheetTitle>
                </SheetHeader>
                <ScrollArea className="flex-1">
                  <div className="p-4 flex flex-col gap-2">
                    {isLoadingSessions ? (
                      <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                    ) : sessions.length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center p-4">No past conversations found.</div>
                    ) : (
                      sessions.map((s) => {
                        const isEditing = editingSessionId === s.sessionId;
                        return (
                          <div
                            key={s.sessionId}
                            className={`flex items-center justify-between p-3 rounded-md border text-sm transition-colors ${
                              sessionId === s.sessionId ? "bg-muted border-primary" : "hover:bg-muted/70"
                            }`}
                          >
                            {isEditing ? (
                              <div className="flex items-center gap-1 w-full">
                                <input
                                  type="text"
                                  value={editingTitle}
                                  onChange={(e) => setEditingTitle(e.target.value)}
                                  className="flex-1 bg-background border px-2 py-1 text-xs rounded focus:outline-none"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      if (editingTitle.trim()) {
                                        renameSession(s.sessionId, editingTitle.trim());
                                      }
                                      setEditingSessionId(null);
                                    } else if (e.key === "Escape") {
                                      setEditingSessionId(null);
                                    }
                                  }}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => {
                                    if (editingTitle.trim()) {
                                      renameSession(s.sessionId, editingTitle.trim());
                                    }
                                    setEditingSessionId(null);
                                  }}
                                >
                                  <Check className="h-3.5 w-3.5 text-green-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => setEditingSessionId(null)}
                                >
                                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    loadSession(s.sessionId);
                                    setIsHistoryOpen(false);
                                  }}
                                  className="flex flex-col text-left flex-1 min-w-0 pr-2 cursor-pointer bg-transparent border-0"
                                >
                                  <span className="font-medium truncate">{s.title}</span>
                                  <span className="text-xs text-muted-foreground mt-1">
                                    {new Date(s.createdAt).toLocaleString()}
                                  </span>
                                </button>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                    title="Rename conversation"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingSessionId(s.sessionId);
                                      setEditingTitle(s.title);
                                    }}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                    title="Delete conversation"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (window.confirm("Are you sure you want to delete this conversation?")) {
                                        deleteSession(s.sessionId);
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Right: AI Provider & Model Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border bg-background px-2.5 py-1 text-xs shadow-2xs">
            <Cpu className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium text-muted-foreground hidden md:inline">
              Model:
            </span>

            {/* Provider Selector */}
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              disabled={isLoading}
              className="bg-transparent text-xs font-semibold text-foreground border-0 focus:outline-none cursor-pointer disabled:opacity-50"
              title="Select AI Provider"
            >
              <option value="default" className="bg-popover text-popover-foreground">
                Default Provider
              </option>
              <option value="openai" className="bg-popover text-popover-foreground">
                OpenAI
              </option>
              <option value="nvidia" className="bg-popover text-popover-foreground">
                NVIDIA NIM
              </option>
              <option value="qwen" className="bg-popover text-popover-foreground">
                Qwen
              </option>
            </select>

            {/* Model Selector (when specific provider chosen) */}
            {selectedProvider !== "default" && currentProviderObj && (
              <>
                <span className="text-muted-foreground/50">/</span>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  disabled={isLoading}
                  className="bg-transparent text-xs font-mono text-foreground border-0 focus:outline-none cursor-pointer max-w-[150px] truncate disabled:opacity-50"
                  title="Select AI Model"
                >
                  {currentProviderObj.models.map((model) => (
                    <option key={model} value={model} className="bg-popover text-popover-foreground">
                      {model}
                    </option>
                  ))}
                </select>
              </>
            )}

            {selectedProvider === "default" && (
              <Badge variant="outline" className="text-[10px] gap-1 font-mono text-muted-foreground py-0">
                <Sparkles className="h-2.5 w-2.5" />
                Auto
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Message area */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border bg-background">
        <div className="flex flex-1 flex-col overflow-hidden p-4">
          <ChatMessageList
            messages={messages}
            repositoryName="Knowledge base"
            isLoading={isLoading}
            onRegenerate={regenerateMessage}
            onSelectHint={handleHintClick}
          />
        </div>

        {/* Input area */}
        <div className="border-t p-4">
          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={() => sendMessage()}
            isLoading={isLoading}
          />

          <div className="mt-2 flex flex-wrap items-center justify-between text-xs text-muted-foreground px-1 gap-2">
            <span>
              Powered by{" "}
              <strong className="text-foreground">
                {selectedProvider === "default"
                  ? "Default Provider"
                  : selectedProvider === "openai"
                  ? "OpenAI"
                  : selectedProvider === "nvidia"
                  ? "NVIDIA NIM"
                  : "Qwen"}
              </strong>
              {selectedModel ? ` (${selectedModel})` : ""}
            </span>

            <span>
              Answers are grounded in uploaded knowledge bases and web-search contexts.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatPanel({ repositoryName = "default" }: ChatPanelProps) {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading chat panel...</div>}>
      <ChatPanelContent repositoryName={repositoryName} />
    </Suspense>
  );
}
