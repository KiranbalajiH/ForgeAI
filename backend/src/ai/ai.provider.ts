import OpenAI from "openai";

console.log("API Key loaded:", !!process.env.OPENROUTER_API_KEY);
console.log("Model:", process.env.OPENROUTER_MODEL);

export const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY!,
  baseURL: "https://openrouter.ai/api/v1",
});