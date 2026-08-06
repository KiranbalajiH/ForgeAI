import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";
import MarkdownRenderer from "./markdown-renderer";

export type MessageRole = "user" | "assistant";

export interface ChatMessageItem {
  id: string;
  role: MessageRole;
  content: string;
}

interface ChatMessageProps {
  message: ChatMessageItem;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 text-sm",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar icon */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "rounded-xl px-4 py-3 leading-relaxed",
          isUser
            ? "max-w-[75%] bg-primary text-primary-foreground rounded-tr-sm"
            : "max-w-[85%] bg-muted text-foreground rounded-tl-sm"
        )}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : (
          <MarkdownRenderer content={message.content} />
        )}
      </div>
    </div>
  );
}
