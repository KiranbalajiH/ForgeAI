import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { createChatSchema } from "./chat.validation";
import {
  createChat,
  getChats,
  getChatById,
  deleteChat,
} from "./chat.service";

interface ChatParams {
  projectId: string;
  id: string;
}

export async function create(
  req: AuthRequest<ChatParams>,
  res: Response
) {
  try {
    const data = createChatSchema.parse(req.body);

    const chat = await createChat(req.params.projectId, data);

    return res.status(201).json({
      success: true,
      data: chat,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

export async function getAll(
  req: AuthRequest<ChatParams>,
  res: Response
) {
  const chats = await getChats(req.params.projectId);

  return res.json({
    success: true,
    data: chats,
  });
}

export async function getOne(
  req: AuthRequest<ChatParams>,
  res: Response
) {
  const chat = await getChatById(req.params.id);

  if (!chat) {
    return res.status(404).json({
      success: false,
      message: "Chat not found",
    });
  }

  return res.json({
    success: true,
    data: chat,
  });
}

export async function remove(
  req: AuthRequest<ChatParams>,
  res: Response
) {
  await deleteChat(req.params.id);

  return res.json({
    success: true,
    message: "Chat deleted successfully",
  });
}