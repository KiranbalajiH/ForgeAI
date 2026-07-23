import { PrismaClient } from "@prisma/client";
import { CreateChatInput } from "./chat.validation";

const prisma = new PrismaClient();

export async function createChat(
  projectId: string,
  data: CreateChatInput
) {
  return await prisma.chatSession.create({
    data: {
      title: data.title,
      projectId,
    },
  });
}

export async function getChats(projectId: string) {
  return await prisma.chatSession.findMany({
    where: {
      projectId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getChatById(id: string) {
  return await prisma.chatSession.findUnique({
    where: {
      id,
    },
  });
}

export async function deleteChat(id: string) {
  return await prisma.chatSession.delete({
    where: {
      id,
    },
  });
}