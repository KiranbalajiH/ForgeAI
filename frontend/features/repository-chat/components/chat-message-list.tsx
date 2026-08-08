"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquareDashed, Bot, Sparkles } from "lucide-react";
import ChatMessage, { ChatMessageItem } from "./chat-message";

interface ChatMessageListProps {
  messages: ChatMessageItem[];
  repositoryName?: string;
  isLoading?: boolean;
  onRegenerate?: (id: string) => void;
  onSelectHint?: (hint: string) => void;
}

export default function ChatMessageList({
  messages,
  repositoryName,
  isLoading = false,
  onRegenerate,
  onSelectHint,
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
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center p-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border bg-muted/50 shadow-2xs">
          <MessageSquareDashed className="h-8 w-8 text-muted-foreground" />
        </div>

        <div className="space-y-1.5 max-w-sm">
          <h3 className="text-base font-semibold text-foreground">
            Ask anything about {repositoryName || "this repository"}
          </h3>

          <p className="text-xs text-muted-foreground leading-relaxed">
            ForgeAI indexes files, controllers, services, routes, and models to give you fast, contextual answers.
          </p>
        </div>

        <div className="mt-3 flex flex-wrap justify-center gap-2 max-w-md">
          {[
            "How does authentication work?",
            "List all API endpoints",
            "What database ORM is used?",
            "Explain the repository architecture",
          ].map((hint) => (
            <button
              key={hint}
              type="button"
              onClick={() => onSelectHint?.(hint)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent hover:text-foreground cursor-pointer"
            >
              <Sparkles className="h-3 w-3 text-primary" />
              <span>{hint}</span>
            </button>
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
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted text-muted-foreground shadow-2xs">
              <Bot className="h-4 w-4 text-primary" />
            </div>

            <div className="flex items-center gap-1.5 rounded-xl border bg-muted/40 px-4 py-3 text-muted-foreground rounded-tl-none shadow-2xs">
              <span className="text-xs font-medium mr-1 text-foreground">ForgeAI is thinking</span>
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
            </div>
          </div>
        )}

        {/* Anchor element for smooth auto-scroll */}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
