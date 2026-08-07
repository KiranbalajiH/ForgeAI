import { LLMProvider as AIProvider } from "./llm-provider";
import { AIConfigService, defaultAIConfigService } from "../ai-config.service";
import { ProviderHealthService, defaultProviderHealthService } from "./provider-health.service";
import { AIProviderFactory } from "./ai-provider.factory";

export class ProviderSelectionService {
  constructor(
    private configService: AIConfigService = defaultAIConfigService,
    private healthService: ProviderHealthService = defaultProviderHealthService
  ) {}

  private getProvider(name: string): AIProvider {
    // Instantiate dynamically on every request.
    // This perfectly isolates provider execution and avoids any startup crashes
    // since zero providers are created until this method is explicitly invoked.
    return AIProviderFactory.createProviderByName(name, this.configService);
  }

  async selectProvider(requiredCapability?: string): Promise<AIProvider> {
    const config = this.configService.get("llm");
    const strategy = config.routingStrategy;

    if (strategy === "manual") {
      return this.getProvider(config.provider);
    }

    if (strategy === "priority" || strategy === "health" || strategy === "capability") {
      const priorityList = config.providerPriority;
      
      for (const providerName of priorityList) {
        let provider: AIProvider;
        try {
          provider = this.getProvider(providerName);
        } catch (e) {
          // If a provider fails to instantiate (e.g., missing API key),
          // skip it in the priority queue instead of crashing.
          continue;
        }

        if (strategy === "health") {
          const health = await this.healthService.getHealth(provider);
          if (health.status === "Healthy") {
            return provider;
          }
        } else if (strategy === "capability" && requiredCapability) {
          const supported = provider.getSupportedModels().some(m => m.includes(requiredCapability));
          if (supported) {
            const health = await this.healthService.getHealth(provider);
            if (health.status !== "Unavailable") {
               return provider;
            }
          }
        } else {
          // Priority strategy (fallback if we just want the highest priority available)
          const health = await this.healthService.getHealth(provider);
          if (health.status !== "Unavailable") {
            return provider;
          }
        }
      }
    }

    // Ultimate fallback
    return this.getProvider("openai");
  }
}

export const defaultProviderSelectionService = new ProviderSelectionService();
