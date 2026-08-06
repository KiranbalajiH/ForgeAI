"use client";

import { useState } from "react";
import { Copy, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatMessageActionsProps {
  content: string;
  onRegenerate?: () => void;
  isLoading?: boolean;
}

export default function ChatMessageActions({
  content,
  onRegenerate,
  isLoading = false,
}: ChatMessageActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  return (
    <div className="mt-2 flex items-center gap-1 opacity-90 transition-opacity">
      {/* Copy Action */}
      <Button
        variant="ghost"
        size="xs"
        onClick={handleCopy}
        className="h-6 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
        title="Copy response as plain text"
      >
        {copied ? (
          <>
            <Check className="h-3 w-3 text-green-500" />
            <span className="text-green-500">Copied</span>
          </>
        ) : (
          <>
            <Copy className="h-3 w-3" />
            <span>Copy</span>
          </>
        )}
      </Button>

      {/* Regenerate Action */}
      {onRegenerate && (
        <Button
          variant="ghost"
          size="xs"
          onClick={onRegenerate}
          disabled={isLoading}
          className="h-6 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
          title="Regenerate AI response"
        >
          <RotateCcw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
          <span>Regenerate</span>
        </Button>
      )}
    </div>
  );
}
