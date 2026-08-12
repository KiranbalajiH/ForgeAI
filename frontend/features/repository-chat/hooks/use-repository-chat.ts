"use client";

import { useState, useCallback, useEffect } from "react";
import {
  repositoryChatService,
  SourceReference,
  AIProviderInfo,
  RepositoryChatMetadata,
  ChatSessionSummary
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
  sessionId: string | null;
  sessions: ChatSessionSummary[];
  isLoadingSessions: boolean;
  setSelectedProvider: (providerId: string) => void;
  setSelectedModel: (modelName: string) => void;
  setInput: (value: string) => void;
  sendMessage: (customQuestion?: string) => Promise<void>;
  regenerateMessage: (messageId: string) => Promise<void>;
  clearConversation: () => void;
  fetchSessions: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, newTitle: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
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
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

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

  const fetchSessions = useCallback(async () => {
    if (!repositoryName) return;
    setIsLoadingSessions(true);
    try {
      const res = await repositoryChatService.getSessions(repositoryName);
      if (res.success) {
        setSessions(res.sessions || []);
      }
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, [repositoryName]);

  const loadSession = useCallback(async (targetSessionId: string) => {
    if (!repositoryName) return;
    setIsLoading(true);
    try {
      const res = await repositoryChatService.getSession(repositoryName, targetSessionId);
      if (res.success && res.session) {
        setSessionId(res.session.sessionId);
        try {
          localStorage.setItem(`forgeai_active_session_${repositoryName}`, res.session.sessionId);
        } catch {}
        setMessages(
          res.session.messages.map((m: any, i: number) => ({
            id: `${m.role}-${i}`,
            role: m.role,
            content: m.content,
            sources: m.sources,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to load session:", err);
      setError("Failed to load conversation history.");
    } finally {
      setIsLoading(false);
    }
  }, [repositoryName]);

  const clearConversation = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setError(null);
    try {
      localStorage.removeItem(`forgeai_active_session_${repositoryName}`);
    } catch {}
  }, [repositoryName]);

  const renameSession = useCallback(async (targetSessionId: string, newTitle: string) => {
    if (!repositoryName || !newTitle.trim()) return;
    try {
      const res = await repositoryChatService.renameSession(repositoryName, targetSessionId, newTitle.trim());
      if (res.success) {
        setSessions((prev) =>
          prev.map((s) => (s.sessionId === targetSessionId ? { ...s, title: res.session.title } : s))
        );
      }
    } catch (err) {
      console.error("Failed to rename session:", err);
      setError("Failed to rename conversation.");
    }
  }, [repositoryName]);

  const deleteSession = useCallback(async (targetSessionId: string) => {
    if (!repositoryName) return;
    try {
      const res = await repositoryChatService.deleteSession(repositoryName, targetSessionId);
      if (res.success) {
        setSessions((prev) => prev.filter((s) => s.sessionId !== targetSessionId));
        if (sessionId === targetSessionId) {
          clearConversation();
        }
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
      setError("Failed to delete conversation.");
    }
  }, [repositoryName, sessionId, clearConversation]);

  // Fetch sessions and auto-restore active session on mount
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    if (sessions.length > 0 && !sessionId && !messages.length) {
      try {
        const storedActiveId = localStorage.getItem(`forgeai_active_session_${repositoryName}`);
        if (storedActiveId && sessions.some((s) => s.sessionId === storedActiveId)) {
          loadSession(storedActiveId);
        }
      } catch {}
    }
  }, [sessions, sessionId, messages.length, repositoryName, loadSession]);

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
        sessionId: sessionId || undefined,
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
      (metadata: RepositoryChatMetadata, sources: SourceReference[]) => {
        if (metadata.sessionId) {
          setSessionId(metadata.sessionId);
          try {
            localStorage.setItem(`forgeai_active_session_${repositoryName}`, metadata.sessionId);
          } catch {}
          // Refresh session list so the new chat shows up immediately
          fetchSessions();
        }
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
  }, [input, isLoading, repositoryName, selectedProvider, selectedModel, sessionId, fetchSessions]);

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
          sessionId: sessionId || undefined,
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
        (metadata: RepositoryChatMetadata, sources: SourceReference[]) => {
          if (metadata.sessionId) {
            setSessionId(metadata.sessionId);
          }
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
    [isLoading, messages, repositoryName, selectedProvider, selectedModel, sessionId]
  );

  return {
    messages,
    input,
    isLoading,
    error,
    selectedProvider,
    selectedModel,
    availableProviders,
    sessionId,
    sessions,
    isLoadingSessions,
    setSelectedProvider,
    setSelectedModel,
    setInput,
    sendMessage,
    regenerateMessage,
    clearConversation,
    fetchSessions,
    loadSession,
    renameSession,
    deleteSession,
  };
}
