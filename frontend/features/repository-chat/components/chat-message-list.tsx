"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquareDashed, Bot } from "lucide-react";
import ChatMessage, { ChatMessageItem } from "./chat-message";

interface ChatMessageListProps {
  messages: ChatMessageItem[];
  repositoryName?: string;
  isLoading?: boolean;
  onRegenerate?: (id: string) => void;
}

export default function ChatMessageList({
  messages,
  repositoryName,
  isLoading = false,
  onRegenerate,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto Scroll to newest message on every token/message update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const isEmpty = messages.length === 0 && !isLoading;
  const lastMessage = messages[messages.length - 1];
  const isInitialThinking =
    isLoading && (!lastMessage || (lastMessage.role === "assistant" && !lastMessage.content));

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
        {messages.map((message) => {
          // Hide empty assistant placeholder while initial thinking indicator is shown
          if (message.role === "assistant" && !message.content && isLoading) {
            return null;
          }

          return (
            <ChatMessage
              key={message.id}
              message={message}
              repositoryName={repositoryName}
              onRegenerate={onRegenerate}
              isLoading={isLoading}
            />
          );
        })}

        {/* Initial Typing Indicator — shown before first token arrives */}
        {isInitialThinking && (
          <div className="flex items-center gap-3 text-sm">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted text-muted-foreground">
              <Bot className="h-4 w-4" />
            </div>

            <div className="flex items-center gap-1.5 rounded-xl bg-muted px-4 py-3 text-muted-foreground rounded-tl-sm">
              <span className="text-xs font-medium mr-1">ForgeAI is thinking</span>
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
            </div>
          </div>
        )}

        {/* Anchor element for smooth auto-scroll */}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
