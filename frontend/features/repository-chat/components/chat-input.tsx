"use client";

import { SendHorizonal } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export default function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading = false,
  disabled = false,
}: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift for newlines)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading && !disabled) {
        onSubmit();
      }
    }
  };

  return (
    <div className="flex items-end gap-3 rounded-xl border bg-background p-3 shadow-sm transition-shadow focus-within:shadow-md">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask a question about this repository… (Enter to send)"
        className="min-h-0 flex-1 resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
        rows={1}
        disabled={disabled || isLoading}
      />

      <Button
        size="icon"
        onClick={onSubmit}
        disabled={!value.trim() || isLoading || disabled}
        aria-label="Send message"
        className="shrink-0"
      >
        <SendHorizonal className="h-4 w-4" />
      </Button>
    </div>
  );
}
