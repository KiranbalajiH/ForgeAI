"use client";

import { useState, useEffect, Suspense } from "react";
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
import { Search, Cpu, Sparkles, Info, Activity, FolderTree, AlertCircle, Clock, Play, RefreshCw, Loader2, MessageSquarePlus, History, Pencil, Trash2, Check, X, Compass } from "lucide-react";
import ChatMessageList from "./chat-message-list";
import ChatInput from "./chat-input";
import { useRepositoryChat } from "@/features/repository-chat/hooks/use-repository-chat";
import RepositoryCodeSearch from "@/features/repositories/components/repository-code-search";
import RepositoryFileTree from "@/features/repositories/components/repository-file-tree";
import RepositoryDetails from "@/features/repositories/components/repository-details";
import RepositoryStatusBadge from "@/features/repositories/components/repository-status-badge";
import RepositoryOverview from "@/features/repositories/components/repository-overview";
import { repositoryService, RepositoryIndexStatus } from "@/services/repository-service";
import { repositories as mockRepositories } from "@/features/repositories/mock-data";
import FileViewerDialog from "@/features/repositories/components/file-viewer-dialog";

interface ChatPanelProps {
  repositoryName: string;
}

function ChatPanelContent({ repositoryName }: ChatPanelProps) {
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

  const [isSearchSheetOpen, setIsSearchSheetOpen] = useState(false);
  const [isTreeSheetOpen, setIsTreeSheetOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [repoIndexStatus, setRepoIndexStatus] = useState<RepositoryIndexStatus | null>(null);
  
  const [viewedFilePath, setViewedFilePath] = useState<string | null>(null);
  const [viewedLineNumber, setViewedLineNumber] = useState<number | null>(null);
  const [isFileViewerOpen, setIsFileViewerOpen] = useState(false);

  // Repository metadata object
  const repoDetail = mockRepositories.find(
    (r) => r.name.toLowerCase() === repositoryName.toLowerCase()
  ) || {
    id: "1",
    name: repositoryName,
    language: "TypeScript",
    status: "Active",
    health: 94,
  };

  const currentProviderObj = availableProviders.find(
    (p) => p.id.toLowerCase() === selectedProvider.toLowerCase()
  );

  const handleHintClick = (hint: string) => {
    if (isLoading) return;
    sendMessage(hint);
  };

  const isChatDisabled = Boolean(
    repoIndexStatus && (repoIndexStatus.status === "NOT_INDEXED" || repoIndexStatus.status === "INDEXING")
  );

  return (
    <div className="flex h-full w-full flex-col gap-4">
      {/* Chat header strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 px-4 py-3">
        {/* Left: Repository Name & Info trigger & Index Status */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              Repository:
            </span>
            <Badge variant="secondary" className="font-mono text-xs">
              {repositoryName}
            </Badge>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDetailsOpen(true)}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
              title="View Repository Info"
            >
              <Info className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Info</span>
            </Button>

            <Sheet open={isOverviewOpen} onOpenChange={setIsOverviewOpen}>
              <SheetTrigger render={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
                  title="View Repository Overview"
                >
                  <Compass className="h-3.5 w-3.5 text-primary" />
                  <span className="hidden sm:inline">Overview</span>
                </Button>
              } />
              <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-6">
                <SheetHeader className="pb-4 border-b">
                  <SheetTitle>Repository Overview - {repositoryName}</SheetTitle>
                </SheetHeader>
                <div className="pt-4">
                  <RepositoryOverview
                    repositoryName={repositoryName}
                    onAskInChat={(_repo, promptText) => {
                      setIsOverviewOpen(false);
                      setInput(promptText);
                    }}
                  />
                </div>
              </SheetContent>
            </Sheet>

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
              <SheetTrigger render={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
                  title="View conversation history"
                >
                  <History className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">History</span>
                </Button>
              } />
              <SheetContent side="left" className="w-full sm:max-w-md flex flex-col p-0">
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
                                  size="icon-sm"
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
                                  size="icon-sm"
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
                                  className="flex flex-col text-left flex-1 min-w-0 pr-2 cursor-pointer"
                                >
                                  <span className="font-medium truncate">{s.title}</span>
                                  <span className="text-xs text-muted-foreground mt-1">
                                    {new Date(s.createdAt).toLocaleString()}
                                  </span>
                                </button>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
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
                                    size="icon-sm"
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

          <RepositoryStatusBadge
            repoName={repositoryName}
            onStatusChange={(status) => setRepoIndexStatus(status)}
          />
        </div>

        {/* Right: AI Provider & Model Selector + Code Search */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Provider & Model Controls */}
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

          {/* Quick Repository Code Search drawer */}
          <Sheet open={isSearchSheetOpen} onOpenChange={setIsSearchSheetOpen}>
            <SheetTrigger render={
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                <Search className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Search Code</span>
              </Button>
            } />
            <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-6">
              <SheetHeader className="pb-4 border-b">
                <SheetTitle>Search Code in {repositoryName}</SheetTitle>
              </SheetHeader>
              <div className="pt-4">
                <RepositoryCodeSearch
                  initialRepoName={repositoryName}
                  onAskInChat={(_repo, promptText) => {
                    setIsSearchSheetOpen(false);
                    setInput(promptText);
                  }}
                />
              </div>
            </SheetContent>
          </Sheet>

          {/* Quick Repository File Browser drawer */}
          <Sheet open={isTreeSheetOpen} onOpenChange={setIsTreeSheetOpen}>
            <SheetTrigger render={
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                <FolderTree className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">File Browser</span>
              </Button>
            } />
            <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-6">
              <SheetHeader className="pb-4 border-b">
                <SheetTitle>File Browser - {repositoryName}</SheetTitle>
              </SheetHeader>
              <div className="pt-4">
                <RepositoryFileTree
                  initialRepoName={repositoryName}
                  onAskInChat={(_repo, promptText) => {
                    setIsTreeSheetOpen(false);
                    setInput(promptText);
                  }}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Message area */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border bg-background">
        {/* STALE Warning Strip */}
        {repoIndexStatus?.status === "STALE" && (
          <div className="flex items-center justify-between gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-700 dark:text-amber-400">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              <span>Source files have changed since the last index. Answers use existing index until synchronized.</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => repositoryService.triggerIndex(repositoryName)}
              className="h-6 px-2 text-[11px] border-amber-500/30 hover:bg-amber-500/20 cursor-pointer"
            >
              Sync Index
            </Button>
          </div>
        )}

        {/* NOT_INDEXED Banner */}
        {repoIndexStatus?.status === "NOT_INDEXED" && (
          <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-2.5 text-xs">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span>Repository <strong>{repositoryName}</strong> needs to be indexed before chat is enabled.</span>
            </div>
            <Button
              size="sm"
              onClick={() => repositoryService.triggerIndex(repositoryName)}
              className="h-7 px-3 text-xs gap-1.5 cursor-pointer"
            >
              <Play className="h-3.5 w-3.5" />
              <span>Index Repo</span>
            </Button>
          </div>
        )}

        {/* INDEXING Banner */}
        {repoIndexStatus?.status === "INDEXING" && (
          <div className="flex items-center justify-between gap-2 border-b border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-xs text-blue-600">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin shrink-0 text-blue-500" />
              <span>Repository <strong>{repositoryName}</strong> is currently being indexed... Chat will be ready once complete.</span>
            </div>
          </div>
        )}

        {/* FAILED Banner */}
        {repoIndexStatus?.status === "FAILED" && (
          <div className="flex items-center justify-between gap-2 border-b border-destructive/30 bg-destructive/10 px-4 py-2.5 text-xs text-destructive">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Indexing attempt failed. {repoIndexStatus.indexError || ""}</span>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => repositoryService.triggerIndex(repositoryName)}
              className="h-7 px-3 text-xs gap-1.5 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </Button>
          </div>
        )}

        <div className="flex flex-1 flex-col overflow-hidden p-4">
          <ChatMessageList
            messages={messages}
            repositoryName={repositoryName}
            isLoading={isLoading}
            onRegenerate={regenerateMessage}
            onSelectHint={handleHintClick}
            onSourceClick={(path, lineNumber) => {
              setViewedFilePath(path);
              setViewedLineNumber(lineNumber || null);
              setIsFileViewerOpen(true);
            }}
          />
        </div>

        {/* Input area */}
        <div className="border-t p-4">
          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={() => sendMessage()}
            isLoading={isLoading}
            disabled={isChatDisabled}
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
              ForgeAI analyses repository structure to answer questions accurately.
            </span>
          </div>
        </div>
      </div>

      {/* Repository details sheet */}
      <RepositoryDetails
        repository={repoDetail}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
      />

      {/* Full Source File Viewer Modal */}
      <FileViewerDialog
        repoName={repositoryName}
        filePath={viewedFilePath}
        lineNumber={viewedLineNumber}
        isOpen={isFileViewerOpen}
        onOpenChange={setIsFileViewerOpen}
        onAskInChat={(repoName, queryText) => setInput(queryText)}
      />
    </div>
  );
}

export default function ChatPanel({ repositoryName }: ChatPanelProps) {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading chat panel...</div>}>
      <ChatPanelContent repositoryName={repositoryName} />
    </Suspense>
  );
}
