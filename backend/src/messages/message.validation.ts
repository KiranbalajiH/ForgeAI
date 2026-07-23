import { z } from "zod";

export const createMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1, "Message cannot be empty"),
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;