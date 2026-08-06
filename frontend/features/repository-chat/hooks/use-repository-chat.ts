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
 * Manages streaming state for Repository Chat:
 * - messages[]       : conversation history displayed in the UI
 * - input            : current textarea value
 * - isLoading        : true while waiting for or receiving streamed tokens
 * - error            : user-friendly error string, null when no error
 * - sendMessage      : streams AI response tokens incrementally
 * - regenerateMessage: re-streams the response for a previous question
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

    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `assistant-${Date.now()}`;

    // 1. Optimistically append user message + empty assistant placeholder
    const userMessage: ChatMessageItem = {
      id: userMsgId,
      role: "user",
      content: question,
    };

    const assistantMessage: ChatMessageItem = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    // 2. Stream tokens incrementally via repositoryChatService
    await repositoryChatService.streamAsk(
      { repository: repositoryName, question },
      (token: string) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, content: msg.content + token }
              : msg
          )
        );
      },
      (_metadata, sources: SourceReference[]) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, sources } : msg
          )
        );
        setIsLoading(false);
      },
      (errorMsg: string) => {
        setError(errorMsg);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  content: msg.content
                    ? `${msg.content}\n\n⚠️ ${errorMsg}`
                    : `⚠️ ${errorMsg}`,
                }
              : msg
          )
        );
        setIsLoading(false);
      }
    );
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

      const newAssistantMsgId = `assistant-${Date.now()}`;

      // Replace old target message with new streaming placeholder
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== targetMessageId),
        { id: newAssistantMsgId, role: "assistant", content: "" },
      ]);

      await repositoryChatService.streamAsk(
        { repository: repositoryName, question: questionToResend },
        (token: string) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === newAssistantMsgId
                ? { ...msg, content: msg.content + token }
                : msg
            )
          );
        },
        (_metadata, sources: SourceReference[]) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === newAssistantMsgId ? { ...msg, sources } : msg
            )
          );
          setIsLoading(false);
        },
        (errorMsg: string) => {
          setError(errorMsg);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === newAssistantMsgId
                ? {
                    ...msg,
                    content: msg.content
                      ? `${msg.content}\n\n⚠️ ${errorMsg}`
                      : `⚠️ ${errorMsg}`,
                  }
                : msg
            )
          );
          setIsLoading(false);
        }
      );
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
