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
import { Search, Cpu, Sparkles, Info, Activity } from "lucide-react";
import ChatMessageList from "./chat-message-list";
import ChatInput from "./chat-input";
import { useRepositoryChat } from "@/features/repository-chat/hooks/use-repository-chat";
import RepositoryCodeSearch from "@/features/repositories/components/repository-code-search";
import RepositoryDetails from "@/features/repositories/components/repository-details";
import { repositories as mockRepositories } from "@/features/repositories/mock-data";

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
  } = useRepositoryChat({ repositoryName, initialQuestion: urlAsk });

  const [isSearchSheetOpen, setIsSearchSheetOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

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

  return (
    <div className="flex h-full w-full flex-col gap-4">
      {/* Chat header strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 px-4 py-3">
        {/* Left: Repository Name & Info trigger */}
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
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
            title="View Repository Info"
          >
            <Info className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Info</span>
          </Button>
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
        </div>
      </div>

      {/* Message area */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border bg-background">
        <div className="flex flex-1 flex-col overflow-hidden p-4">
          <ChatMessageList
            messages={messages}
            repositoryName={repositoryName}
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
