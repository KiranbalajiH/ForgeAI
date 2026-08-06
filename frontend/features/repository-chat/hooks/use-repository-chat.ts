"use client";

import { useState, useCallback } from "react";
import {
  repositoryChatService,
  SourceReference,
} from "@/services/repository-chat-service";
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
  regenerateMessage: (messageId: string) => Promise<void>;
}

/**
 * useRepositoryChat
 *
 * Manages state for Repository Chat:
 * - messages[]       : conversation history displayed in the UI
 * - input            : current textarea value
 * - isLoading        : true while waiting for API response
 * - error            : user-friendly error string, null when no error
 * - sendMessage      : submits current input, appends user message + AI response (with sources)
 * - regenerateMessage: re-sends the previous user question for a specific AI response
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

    // 1. Optimistically append user's message immediately
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

      const sources: SourceReference[] =
        response.metadata?.sources ?? response.sources ?? [];

      // 3. Append the AI response with source citations
      const assistantMessage: ChatMessageItem = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.answer,
        sources,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";

      setError(message);

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

  const regenerateMessage = useCallback(
    async (targetMessageId: string) => {
      if (isLoading) return;

      const index = messages.findIndex((m) => m.id === targetMessageId);
      if (index === -1) return;

      const precedingUserMsg = messages
        .slice(0, index)
        .reverse()
        .find((m) => m.role === "user");

      const questionToResend = precedingUserMsg
        ? precedingUserMsg.content
        : messages.slice(0, index).length > 0
        ? messages[0].content
        : null;

      if (!questionToResend) return;

      setIsLoading(true);
      setError(null);

      setMessages((prev) => prev.filter((m) => m.id !== targetMessageId));

      try {
        const response = await repositoryChatService.ask({
          repository: repositoryName,
          question: questionToResend,
        });

        const sources: SourceReference[] =
          response.metadata?.sources ?? response.sources ?? [];

        const newAssistantMsg: ChatMessageItem = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: response.answer,
          sources,
        };

        setMessages((prev) => [...prev, newAssistantMsg]);
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to regenerate response. Please try again.";

        setError(message);

        const errorMessage: ChatMessageItem = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: `⚠️ ${message}`,
        };

        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages, repositoryName]
  );

  return {
    messages,
    input,
    isLoading,
    error,
    setInput,
    sendMessage,
    regenerateMessage,
  };
}
