"use client";

import { useState, useCallback } from "react";
import { repositoryChatService } from "@/services/repository-chat-service";
import { ChatMessageItem } from "@/features/repository-chat/components/chat-message";

interface UseRepositoryChatOptions {
  repositoryName: string;
}

interface UseRepositoryChatReturn {
  messages: ChatMessageItem[];
  input: string;
  isLoading: boolean;
  error: string | null;
  setInput: (value: string) => void;
  sendMessage: () => Promise<void>;
}

/**
 * useRepositoryChat
 *
 * Manages all state for a single-turn Repository Chat session:
 * - messages[]   : conversation history displayed in the UI
 * - input        : current textarea value
 * - isLoading    : true while waiting for the API response
 * - error        : user-friendly error string, null when no error
 * - sendMessage  : submits the current input, appends both messages, clears input
 */
export function useRepositoryChat({
  repositoryName,
}: UseRepositoryChatOptions): UseRepositoryChatReturn {
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async () => {
    const question = input.trim();
    if (!question || isLoading) return;

    // 1. Optimistically append the user's message immediately
    const userMessage: ChatMessageItem = {
      id: `user-${Date.now()}`,
      role: "user",
      content: question,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      // 2. Call the existing RepositoryChatService
      const response = await repositoryChatService.ask({
        repository: repositoryName,
        question,
      });

      // 3. Append the AI response
      const assistantMessage: ChatMessageItem = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.answer,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: unknown) {
      // 4. Surface a user-friendly error — do NOT remove the user's message
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";

      setError(message);

      // Append an error bubble as an assistant message so context is preserved
      const errorMessage: ChatMessageItem = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `⚠️ ${message}`,
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, repositoryName]);

  return {
    messages,
    input,
    isLoading,
    error,
    setInput,
    sendMessage,
  };
}
