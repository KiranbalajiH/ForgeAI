import { LLMProvider } from "./llm-provider";
import { AIConfigService, defaultAIConfigService } from "../ai-config.service";

export type ProviderStatus = "Healthy" | "Degraded" | "Unavailable";

export interface ProviderHealthStatus {
  provider: string;
  status: ProviderStatus;
  responseTimeMs: number;
  lastChecked: string;
  defaultModel: string;
  supportedModels: string[];
  error?: string;
}

export class ProviderHealthService {
  private cache: Map<string, { status: ProviderHealthStatus; expiresAt: number }> = new Map();
  private configService: AIConfigService;

  constructor(configService?: AIConfigService) {
    this.configService = configService ?? defaultAIConfigService;
  }

  async getHealth(provider: LLMProvider): Promise<ProviderHealthStatus> {
    const providerName = provider.getProviderName();
    const now = Date.now();
    const cached = this.cache.get(providerName);

    if (cached && now < cached.expiresAt) {
      return cached.status;
    }

    const healthResult = await provider.checkHealth();
    let status: ProviderStatus = "Healthy";
    
    if (!healthResult.isHealthy) {
      status = "Unavailable";
    } else if (healthResult.responseTimeMs > 2000) { 
      // Mark as degraded if response time exceeds 2 seconds
      status = "Degraded";
    }

    const llmConfig = this.configService.get("llm");

    const healthStatus: ProviderHealthStatus = {
      provider: providerName,
      status,
      responseTimeMs: healthResult.responseTimeMs,
      lastChecked: new Date().toISOString(),
      defaultModel: llmConfig.defaultModel,
      supportedModels: provider.getSupportedModels(),
      error: healthResult.error
    };

    this.cache.set(providerName, {
      status: healthStatus,
      expiresAt: now + llmConfig.healthCheckCacheMs
    });

    return healthStatus;
  }
}

export const defaultProviderHealthService = new ProviderHealthService();
