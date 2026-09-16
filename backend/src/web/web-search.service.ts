import { RetrievedSource } from "../retrieval/retrieval.types";
import { logger } from "../utils/logger";

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export class WebSearchProvider {
  async search(query: string, limit = 5): Promise<WebSearchResult[]> {
    const tavilyKey = process.env.TAVILY_API_KEY;

    // 1. Optional: Tavily Search API if key provided
    if (tavilyKey && tavilyKey.trim().length > 0) {
      try {
        const response = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: tavilyKey,
            query,
            max_results: limit,
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as any;
          if (Array.isArray(data.results)) {
            return data.results.map((r: any) => ({
              title: r.title || "Web Result",
              url: r.url || "https://tavily.com",
              snippet: r.content || r.snippet || "",
            }));
          }
        }
      } catch (err: any) {
        logger.warn(`[WebSearchProvider] Tavily API search failed: ${err?.message}`);
      }
    }

    // 2. Real Web Search via Wikipedia OpenSearch API + DuckDuckGo API (Zero API key required)
    try {
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(
        query
      )}&limit=${limit}&namespace=0&format=json`;

      const response = await fetch(wikiUrl);
      if (response.ok) {
        const data = (await response.json()) as any[];
        // OpenSearch API returns: [query, [titles], [snippets], [urls]]
        if (Array.isArray(data) && data.length >= 4) {
          const titles: string[] = data[1] || [];
          const snippets: string[] = data[2] || [];
          const urls: string[] = data[3] || [];

          const results: WebSearchResult[] = [];
          for (let i = 0; i < titles.length; i++) {
            results.push({
              title: titles[i] || "Wikipedia Article",
              url: urls[i] || `https://en.wikipedia.org/wiki/${encodeURIComponent(titles[i])}`,
              snippet: snippets[i] || `Information about ${titles[i]} on Wikipedia.`,
            });
          }

          if (results.length > 0) {
            return results;
          }
        }
      }
    } catch (err: any) {
      logger.warn(`[WebSearchProvider] Wikipedia API search failed: ${err?.message}`);
    }

    // 3. Fallback: DuckDuckGo Instant Answer API
    try {
      const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`;
      const response = await fetch(ddgUrl);
      if (response.ok) {
        const data = (await response.json()) as any;
        const results: WebSearchResult[] = [];

        if (data.AbstractText) {
          results.push({
            title: data.Heading || query,
            url: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
            snippet: data.AbstractText,
          });
        }

        if (Array.isArray(data.RelatedTopics)) {
          for (const topic of data.RelatedTopics) {
            if (topic.Text && topic.FirstURL && results.length < limit) {
              results.push({
                title: topic.Text.slice(0, 60) + "...",
                url: topic.FirstURL,
                snippet: topic.Text,
              });
            }
          }
        }

        if (results.length > 0) {
          return results;
        }
      }
    } catch (err: any) {
      logger.warn(`[WebSearchProvider] DuckDuckGo API search failed: ${err?.message}`);
    }

    return [];
  }
}

export class WebSearchService {
  private provider: WebSearchProvider;

  constructor() {
    this.provider = new WebSearchProvider();
  }

  async search(query: string, limit = 5): Promise<RetrievedSource[]> {
    logger.info(`[WebSearchService] Executing real web search for query: "${query}"`);
    try {
      const rawResults = await this.provider.search(query, limit);

      if (rawResults.length === 0) {
        return [];
      }

      return rawResults.map((item, index) => ({
        id: `web-${Date.now()}-${index}`,
        sourceType: "web" as const,
        title: item.title,
        content: item.snippet,
        url: item.url,
        relevanceScore: parseFloat((0.95 - index * 0.05).toFixed(2)),
      }));
    } catch (err: any) {
      logger.error(`[WebSearchService] Web search failed for query "${query}":`, err);
      return [];
    }
  }
}

export const webSearchService = new WebSearchService();
