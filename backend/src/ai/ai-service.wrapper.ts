import * as crypto from "crypto";

export type ErrorCategory = "Validation" | "NotFound" | "Timeout" | "Dependency" | "Internal";

export class AIServiceError extends Error {
  constructor(
    public message: string,
    public category: ErrorCategory,
    public originalError?: unknown
  ) {
    super(message);
    this.name = "AIServiceError";
  }
}

export interface AITelemetryLog {
  requestId: string;
  repositoryId: string;
  serviceName: string;
  executionTimeMs: number;
  success: boolean;
  errorCategory?: ErrorCategory;
  errorMessage?: string;
  timestamp: string;
}

export class AILogger {
  static log(telemetry: AITelemetryLog) {
    // Structured JSON log for observability
    console.log(`[AITelemetry] ${JSON.stringify(telemetry)}`);
  }
}

/**
 * Standardized wrapper for all AI backend services.
 * Injects request tracing, execution timing, and structured error handling,
 * eliminating duplicated try/catch blocks across the AI layer.
 *
 * @param serviceName Name of the service (e.g., "DocumentationGenerationService")
 * @param repositoryId Repository being operated on
 * @param operation The async logic to execute
 */
export async function executeWithTelemetry<T>(
  serviceName: string,
  repositoryId: string,
  operation: (requestId: string) => Promise<T>
): Promise<T> {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const result = await operation(requestId);
    const executionTimeMs = Date.now() - startTime;

    AILogger.log({
      requestId,
      repositoryId,
      serviceName,
      executionTimeMs,
      success: true,
      timestamp: new Date().toISOString(),
    });

    return result;
  } catch (error: any) {
    const executionTimeMs = Date.now() - startTime;
    const isAIServiceError = error instanceof AIServiceError;
    
    // Default to Internal error if it wasn't pre-categorized
    const errorCategory: ErrorCategory = isAIServiceError ? error.category : "Internal";
    const errorMessage = error.message || "Unknown error occurred";

    AILogger.log({
      requestId,
      repositoryId,
      serviceName,
      executionTimeMs,
      success: false,
      errorCategory,
      errorMessage,
      timestamp: new Date().toISOString(),
    });

    // Rethrow standard error for upstream controller handling
    if (isAIServiceError) {
      throw error;
    }
    throw new AIServiceError(errorMessage, errorCategory, error);
  }
}

/**
 * Synchronous version of executeWithTelemetry.
 * Useful for pure computational or cached operations like RepositoryKnowledgeService.retrieve.
 */
export function executeWithTelemetrySync<T>(
  serviceName: string,
  repositoryId: string,
  operation: (requestId: string) => T
): T {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const result = operation(requestId);
    const executionTimeMs = Date.now() - startTime;

    AILogger.log({
      requestId,
      repositoryId,
      serviceName,
      executionTimeMs,
      success: true,
      timestamp: new Date().toISOString(),
    });

    return result;
  } catch (error: any) {
    const executionTimeMs = Date.now() - startTime;
    const isAIServiceError = error instanceof AIServiceError;
    
    const errorCategory: ErrorCategory = isAIServiceError ? error.category : "Internal";
    const errorMessage = error.message || "Unknown error occurred";

    AILogger.log({
      requestId,
      repositoryId,
      serviceName,
      executionTimeMs,
      success: false,
      errorCategory,
      errorMessage,
      timestamp: new Date().toISOString(),
    });

    if (isAIServiceError) {
      throw error;
    }
    throw new AIServiceError(errorMessage, errorCategory, error);
  }
}
