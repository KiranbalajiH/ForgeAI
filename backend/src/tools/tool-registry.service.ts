import { Tool } from "./tool.types";
import { vectorSearchService } from "../retrieval/vector-search.service";
import { webSearchService } from "../web/web-search.service";
import { apiFunctionService } from "./api-function.service";

export class ToolRegistryService {
  private tools = new Map<string, Tool>();

  constructor() {
    this.registerDefaultTools();
  }

  register(tool: Tool) {
    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  list(): Tool[] {
    return Array.from(this.tools.values());
  }

  private registerDefaultTools() {
    // 1. Vector Search Tool
    this.register({
      name: "vector_search",
      description:
        "Search internal uploaded documents, company policies, employee handbooks, or internal knowledge base for semantically relevant content.",
      async execute(query: string) {
        return vectorSearchService.search(query);
      },
    });

    // 2. Real Web Search Tool
    this.register({
      name: "web_search",
      description:
        "Search the public web for real-time external information, current public news, world events, Wikipedia articles, or general facts.",
      async execute(query: string) {
        return webSearchService.search(query);
      },
    });

    // 3. API / Function Tool
    this.register({
      name: "api_function",
      description:
        "Execute structured API function queries for real-time currency exchange rates, financial conversion data, or system performance metrics.",
      async execute(query: string) {
        return apiFunctionService.executeExchangeRateQuery(query);
      },
    });

    // Alias api_functions to api_function for backwards compatibility
    this.register({
      name: "api_functions",
      description:
        "Execute structured API function queries for real-time currency exchange rates, financial conversion data, or system performance metrics.",
      async execute(query: string) {
        return apiFunctionService.executeExchangeRateQuery(query);
      },
    });
  }
}

export const toolRegistryService = new ToolRegistryService();
