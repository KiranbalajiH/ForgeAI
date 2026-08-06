"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquareDashed } from "lucide-react";
import ChatMessage, { ChatMessageItem } from "./chat-message";

interface ChatMessageListProps {
  messages: ChatMessageItem[];
  isLoading?: boolean;
}

export default function ChatMessageList({
  messages,
  isLoading = false,
}: ChatMessageListProps) {
  const isEmpty = messages.length === 0 && !isLoading;

  if (isEmpty) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border bg-muted">
          <MessageSquareDashed className="h-8 w-8 text-muted-foreground" />
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-semibold">
            Ask anything about your repository
          </h3>

          <p className="max-w-xs text-sm text-muted-foreground">
            Type a question below and ForgeAI will analyze your codebase
            to give you an accurate answer.
          </p>
        </div>

        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {[
            "How does authentication work?",
            "List all API endpoints",
            "What database is used?",
          ].map((hint) => (
            <span
              key={hint}
              className="rounded-full border border-dashed px-3 py-1 text-xs text-muted-foreground"
            >
              {hint}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 pr-2">
      <div className="space-y-6 pb-4">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {/* Loading skeleton — shown while waiting for the AI response */}
        {isLoading && (
          <div className="flex gap-3">
            {/* Avatar placeholder */}
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />

            {/* Text lines placeholder */}
            <div className="flex flex-1 flex-col gap-2 pt-1">
              <Skeleton className="h-4 w-3/4 rounded-lg" />
              <Skeleton className="h-4 w-1/2 rounded-lg" />
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
