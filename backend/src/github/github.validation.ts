import { z } from "zod";

export const connectGithubSchema = z.object({
  token: z.string().min(1, "GitHub Personal Access Token is required"),
});

export type ConnectGithubInput = z.infer<typeof connectGithubSchema>;