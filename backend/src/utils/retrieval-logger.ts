/**
 * Structured Telemetry Logging for Semantic Retrieval Pipeline
 */
export interface RetrievalTelemetry {
  /** Developer query string */
  query: string;
  /** Classified search intent */
  detectedIntent: string;
  /** Search execution duration in milliseconds */
  searchDurationMs: number;
  /** Total matching candidates found by search service */
  searchResultsCount: number;
  /** Total retained context chunks after deduplication & budget capping */
  retrievedChunksCount: number;
  /** Final formatted prompt context size in bytes */
  finalContextSizeBytes: number;
  /** Whether the fallback broad repository strategy was used */
  fallbackUsed: boolean;
  /** ISO timestamp of log entry */
  timestamp: string;
}

export class RetrievalLogger {
  /**
   * Logs structured JSON telemetry for a retrieval pipeline execution.
   */
  static logTelemetry(telemetry: RetrievalTelemetry): void {
    console.log(`[RetrievalPipeline] ${JSON.stringify(telemetry)}`);
  }
}
