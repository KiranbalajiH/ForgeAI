import { randomUUID } from "crypto";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface ChatSession {
  sessionId: string;
  repoName: string;
  createdAt: Date;
  messages: ChatMessage[];
}

/**
 * Manages in-memory chat sessions for repository chat.
 * Each session is scoped to a repoName and holds conversation history.
 */
export class ChatSessionService {
  private sessions = new Map<string, ChatSession>();

  create(repoName: string): ChatSession {
    const session: ChatSession = {
      sessionId: randomUUID(),
      repoName,
      createdAt: new Date(),
      messages: [],
    };

    this.sessions.set(session.sessionId, session);
    return session;
  }

  get(sessionId: string): ChatSession | null {
    return this.sessions.get(sessionId) ?? null;
  }

  getOrCreate(sessionId: string | undefined, repoName: string): ChatSession {
    if (sessionId) {
      const existing = this.get(sessionId);
      if (existing && existing.repoName === repoName) {
        return existing;
      }
    }

    return this.create(repoName);
  }

  append(sessionId: string, message: ChatMessage): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messages.push(message);
    }
  }

  delete(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  listByRepo(repoName: string): ChatSession[] {
    return [...this.sessions.values()].filter(
      (s) => s.repoName === repoName
    );
  }
}
