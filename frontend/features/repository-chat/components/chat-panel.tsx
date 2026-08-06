"use client";

import { Badge } from "@/components/ui/badge";
import ChatMessageList from "./chat-message-list";
import ChatInput from "./chat-input";
import { useRepositoryChat } from "@/features/repository-chat/hooks/use-repository-chat";

interface ChatPanelProps {
  repositoryName: string;
}

export default function ChatPanel({ repositoryName }: ChatPanelProps) {
  const {
    messages,
    input,
    isLoading,
    setInput,
    sendMessage,
    regenerateMessage,
  } = useRepositoryChat({ repositoryName });

  return (
    <div className="flex h-full w-full flex-col gap-4">
      {/* Chat header strip */}
      <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Repository:
          </span>
          <Badge variant="secondary" className="font-mono text-xs">
            {repositoryName}
          </Badge>
        </div>

        <span className="text-xs text-muted-foreground">
          {isLoading
            ? "Thinking…"
            : messages.length === 0
            ? "No messages yet"
            : `${messages.length} message${messages.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Message area */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border bg-background">
        <div className="flex flex-1 flex-col overflow-hidden p-4">
          <ChatMessageList
            messages={messages}
            isLoading={isLoading}
            onRegenerate={regenerateMessage}
          />
        </div>

        {/* Input area */}
        <div className="border-t p-4">
          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={sendMessage}
            isLoading={isLoading}
          />

          <p className="mt-2 text-center text-xs text-muted-foreground">
            ForgeAI analyses your repository structure to answer questions accurately.
          </p>
        </div>
      </div>
    </div>
  );
}
