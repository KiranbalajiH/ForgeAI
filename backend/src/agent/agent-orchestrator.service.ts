import { LLMService } from "../ai/llm.service";
import { toolRegistryService } from "../tools/tool-registry.service";
import { RetrievedSource } from "../retrieval/retrieval.types";
import { logger } from "../utils/logger";

export class AgentOrchestratorService {
  private llmService: LLMService;

  constructor() {
    this.llmService = new LLMService();
  }

  async planAndExecute(
    question: string
  ): Promise<{ toolsUsed: string[]; sources: RetrievedSource[] }> {
    const toolsUsed: string[] = [];
    const sources: RetrievedSource[] = [];

    let selectedTools: string[] = [];

    try {
      const prompt = `You are an Agentic Query Router. Analyze the user query below and select the necessary tool(s) to answer it.

Available Tools:
1. "vector_search": Internal knowledge base, uploaded documents, company policies, manuals, internal guidelines.
2. "web_search": Public external web info, current events, recent news, public facts, weather, online information.
3. "api_function": Structured financial data, live currency exchange rates, conversion rates, or system metrics.

Rules:
- Select 1 or more relevant tools: ["vector_search"], ["web_search"], ["api_function"], or multi-tool combinations like ["vector_search", "web_search"].
- Output ONLY a raw valid JSON array of tool names. Do NOT output any markdown, backticks, or explanation.

User Query: "${question}"`;

      const response = await this.llmService.chat(prompt);
      const cleaned = response
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      try {
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) {
          selectedTools = parsed;
        }
      } catch {
        // Simple string matching fallback
        if (cleaned.includes("vector_search")) selectedTools.push("vector_search");
        if (cleaned.includes("web_search")) selectedTools.push("web_search");
        if (cleaned.includes("api_function") || cleaned.includes("api_functions")) {
          selectedTools.push("api_function");
        }
      }
    } catch (err: any) {
      logger.warn(`[AgentOrchestrator] LLM routing failed: ${err?.message}. Using heuristic router.`);
    }

    // Heuristic routing fallback if LLM classification returned empty or failed
    if (selectedTools.length === 0) {
      const lower = question.toLowerCase();
      if (
        lower.includes("exchange") ||
        lower.includes("currency") ||
        lower.includes("rate") ||
        lower.includes("convert") ||
        lower.includes("usd") ||
        lower.includes("eur") ||
        lower.includes("inr")
      ) {
        selectedTools.push("api_function");
      }
      if (
        lower.includes("latest") ||
        lower.includes("news") ||
        lower.includes("weather") ||
        lower.includes("today") ||
        lower.includes("current") ||
        lower.includes("web")
      ) {
        selectedTools.push("web_search");
      }
      if (selectedTools.length === 0) {
        selectedTools.push("vector_search");
      }
    }

    logger.info(`[AgentOrchestrator] Routing question "${question}" to tools:`, selectedTools);

    for (const toolName of selectedTools) {
      const tool = toolRegistryService.get(toolName);
      if (tool) {
        try {
          toolsUsed.push(tool.name);
          const toolResults = await tool.execute(question);
          sources.push(...toolResults);
        } catch (err: any) {
          logger.error(`[AgentOrchestrator] Failed executing tool "${toolName}":`, err);
        }
      }
    }

    // If selected tools yielded 0 sources and vector_search wasn't tried, try vector_search fallback
    if (sources.length === 0 && !toolsUsed.includes("vector_search")) {
      const vectorTool = toolRegistryService.get("vector_search");
      if (vectorTool) {
        try {
          toolsUsed.push("vector_search");
          const vectorResults = await vectorTool.execute(question);
          sources.push(...vectorResults);
        } catch (err: any) {
          logger.error("[AgentOrchestrator] Vector search fallback failed:", err);
        }
      }
    }

    return {
      toolsUsed,
      sources,
    };
  }
}

export const agentOrchestratorService = new AgentOrchestratorService();
