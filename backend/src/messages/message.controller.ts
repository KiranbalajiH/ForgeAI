import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { createMessageSchema } from "./message.validation";
import {
  createMessageWithAI,
  getMessages,
  getMessageById,
  deleteMessage,
} from "./message.service";

interface MessageParams {
  sessionId: string;
  id: string;
}

export async function create(
  req: AuthRequest<MessageParams>,
  res: Response
) {
  try {
    const data = createMessageSchema.parse(req.body);

    const result = await createMessageWithAI(
      req.params.sessionId,
      data
    );

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("========== MESSAGE CONTROLLER ERROR ==========");
    console.error(error);
    console.error("==============================================");

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

export async function getAll(
  req: AuthRequest<MessageParams>,
  res: Response
) {
  try {
    const messages = await getMessages(req.params.sessionId);

    return res.json({
      success: true,
      data: messages,
    });
  } catch (error: any) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

export async function getOne(
  req: AuthRequest<MessageParams>,
  res: Response
) {
  try {
    const message = await getMessageById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    return res.json({
      success: true,
      data: message,
    });
  } catch (error: any) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

export async function remove(
  req: AuthRequest<MessageParams>,
  res: Response
) {
  try {
    await deleteMessage(req.params.id);

    return res.json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error: any) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}