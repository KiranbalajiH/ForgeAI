"use client";

import { useState, useCallback, useEffect } from "react";
import {
  repositoryChatService,
  SourceReference,
  AIProviderInfo,
} from "@/services/repository-chat-service";
import { ChatMessageItem } from "@/features/repository-chat/components/chat-message";

interface UseRepositoryChatOptions {
  repositoryName: string;
  initialProvider?: string;
  initialModel?: string;
  initialQuestion?: string;
}

interface UseRepositoryChatReturn {
  messages: ChatMessageItem[];
  input: string;
  isLoading: boolean;
  error: string | null;
  selectedProvider: string;
  selectedModel: string;
  availableProviders: AIProviderInfo[];
  setSelectedProvider: (providerId: string) => void;
  setSelectedModel: (modelName: string) => void;
  setInput: (value: string) => void;
  sendMessage: (customQuestion?: string) => Promise<void>;
  regenerateMessage: (messageId: string) => Promise<void>;
}

export function useRepositoryChat({
  repositoryName,
  initialProvider = "default",
  initialModel = "",
  initialQuestion = "",
}: UseRepositoryChatOptions): UseRepositoryChatReturn {
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [input, setInput] = useState(initialQuestion);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedProvider, setSelectedProviderState] = useState<string>(initialProvider);
  const [selectedModel, setSelectedModelState] = useState<string>(initialModel);
  const [availableProviders, setAvailableProviders] = useState<AIProviderInfo[]>([
    {
      id: "openai",
      name: "OpenAI",
      models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo", "o1-preview", "o1-mini"],
    },
    {
      id: "nvidia",
      name: "NVIDIA NIM",
      models: [
        "meta/llama-3.1-405b-instruct",
        "meta/llama-3.1-70b-instruct",
        "meta/llama-3.1-8b-instruct",
        "mistralai/mixtral-8x22b-instruct-v0.1",
        "nvidia/nemotron-4-340b-instruct",
      ],
    },
    {
      id: "qwen",
      name: "Qwen",
      models: ["qwen-max", "qwen-plus", "qwen-turbo", "qwen-long", "qwen-vl-plus", "qwen-vl-max"],
    },
  ]);

  // Sync initialQuestion if updated externally
  useEffect(() => {
    if (initialQuestion && !input) {
      setInput(initialQuestion);
    }
  }, [initialQuestion]);

  // Load configured providers from backend
  useEffect(() => {
    repositoryChatService
      .getProviders()
      .then((res) => {
        if (res.success && res.providers?.length) {
          setAvailableProviders(res.providers);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch AI providers from backend, using fallback provider list:", err);
      });
  }, []);

  const setSelectedProvider = useCallback((providerId: string) => {
    setSelectedProviderState(providerId);
    if (providerId === "default") {
      setSelectedModelState("");
    } else {
      const match = availableProviders.find((p) => p.id === providerId);
      if (match && match.models.length > 0) {
        setSelectedModelState(match.models[0]);
      } else {
        setSelectedModelState("");
      }
    }
  }, [availableProviders]);

  const setSelectedModel = useCallback((modelName: string) => {
    setSelectedModelState(modelName);
  }, []);

  const sendMessage = useCallback(async (customQuestion?: string) => {
    const question = (customQuestion || input).trim();
    if (!question || isLoading) return;

    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `assistant-${Date.now()}`;

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

    const providerParam = selectedProvider !== "default" ? selectedProvider : undefined;
    const modelParam = selectedModel.trim() || undefined;

    await repositoryChatService.streamAsk(
      {
        repository: repositoryName,
        question,
        provider: providerParam,
        model: modelParam,
      },
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
  }, [input, isLoading, repositoryName, selectedProvider, selectedModel]);

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

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== targetMessageId),
        { id: newAssistantMsgId, role: "assistant", content: "" },
      ]);

      const providerParam = selectedProvider !== "default" ? selectedProvider : undefined;
      const modelParam = selectedModel.trim() || undefined;

      await repositoryChatService.streamAsk(
        {
          repository: repositoryName,
          question: questionToResend,
          provider: providerParam,
          model: modelParam,
        },
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
    [isLoading, messages, repositoryName, selectedProvider, selectedModel]
  );

  return {
    messages,
    input,
    isLoading,
    error,
    selectedProvider,
    selectedModel,
    availableProviders,
    setSelectedProvider,
    setSelectedModel,
    setInput,
    sendMessage,
    regenerateMessage,
  };
}
