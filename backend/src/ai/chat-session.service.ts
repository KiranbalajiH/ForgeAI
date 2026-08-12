import { randomUUID } from "crypto";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: any[];
}

export interface ChatSession {
  sessionId: string;
  repoName: string;
  userId: string;
  createdAt: Date;
  title?: string;
  messages: ChatMessage[];
}

/**
 * Manages in-memory chat sessions for repository chat.
 * Each session is scoped to a repoName and userId, holding conversation history.
 */
export class ChatSessionService {
  private sessions = new Map<string, ChatSession>();

  create(repoName: string, userId: string): ChatSession {
    const session: ChatSession = {
      sessionId: randomUUID(),
      repoName,
      userId,
      createdAt: new Date(),
      messages: [],
    };

    this.sessions.set(session.sessionId, session);
    return session;
  }

  get(sessionId: string): ChatSession | null {
    return this.sessions.get(sessionId) ?? null;
  }

  getOrCreate(sessionId: string | undefined, repoName: string, userId: string): ChatSession {
    if (sessionId) {
      const existing = this.get(sessionId);
      if (existing && existing.repoName === repoName && existing.userId === userId) {
        return existing;
      }
    }

    return this.create(repoName, userId);
  }

  append(sessionId: string, message: ChatMessage): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messages.push(message);
    }
  }

  rename(sessionId: string, title: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.title = title;
      return true;
    }
    return false;
  }

  delete(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  listByRepo(repoName: string, userId: string): ChatSession[] {
    return [...this.sessions.values()].filter(
      (s) => s.repoName === repoName && s.userId === userId
    );
  }
}

export const chatSessionService = new ChatSessionService();
