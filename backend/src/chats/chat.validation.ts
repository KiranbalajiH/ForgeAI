import { z } from "zod";

export const createChatSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title cannot exceed 100 characters"),
});

export type CreateChatInput = z.infer<typeof createChatSchema>;