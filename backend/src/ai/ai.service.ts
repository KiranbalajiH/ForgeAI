import { openai } from "./ai.provider";
import { AIMessage } from "./ai.types";

export async function generateResponse(
  messages: AIMessage[]
): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || "qwen/qwen3-coder:free",
      messages,
    });

    return completion.choices[0]?.message?.content ?? "";
  } catch (error: any) {
    console.error("===== OPENROUTER ERROR =====");
    console.dir(error, { depth: null });
    console.error("============================");

    throw new Error("Failed to generate AI response");
  }
}