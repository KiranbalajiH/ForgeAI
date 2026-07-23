import { PrismaClient, Message } from "@prisma/client";
import { CreateMessageInput } from "./message.validation";
import { generateResponse } from "../ai/ai.service";
import { AIMessage } from "../ai/ai.types";

const prisma = new PrismaClient();

export async function createMessageWithAI(
  sessionId: string,
  data: CreateMessageInput
) {
  // Save user message
  const userMessage = await prisma.message.create({
    data: {
      sessionId,
      role: data.role,
      content: data.content,
    },
  });

  // Get conversation history
  const history: Message[] = await prisma.message.findMany({
    where: {
      sessionId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const messages: AIMessage[] = history.map((msg: Message) => ({
    role: msg.role === "assistant" ? "assistant" : "user",
    content: msg.content,
  }));

  // Generate AI response
  const aiResponse = await generateResponse(messages);

  // Save assistant response
  const assistantMessage = await prisma.message.create({
    data: {
      sessionId,
      role: "assistant",
      content: aiResponse,
    },
  });

  return {
    userMessage,
    assistantMessage,
  };
}

export async function getMessages(sessionId: string) {
  return prisma.message.findMany({
    where: {
      sessionId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function getMessageById(id: string) {
  return prisma.message.findUnique({
    where: {
      id,
    },
  });
}

export async function deleteMessage(id: string) {
  return prisma.message.delete({
    where: {
      id,
    },
  });
}