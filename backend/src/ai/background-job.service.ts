import * as crypto from "crypto";

export type JobStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

export interface Job<T = any, M = any> {
  id: string;
  type: string;
  status: JobStatus;
  progress: number;
  startTime?: string;
  endTime?: string;
  error?: string;
  metadata?: M;
  result?: T;
}

export interface JobOptions<M = any> {
  type: string;
  metadata?: M;
}

/**
 * Reusable background job framework for long-running AI operations.
 * Designed to be easily swappable with Redis, BullMQ, or RabbitMQ later.
 */
export class BackgroundJobService {
  private jobs: Map<string, Job> = new Map();

  /**
   * Enqueues a job for background execution.
   */
  public enqueue<T, M>(
    options: JobOptions<M>,
    executor: (jobId: string, updateProgress: (progress: number) => void) => Promise<T>
  ): string {
    const jobId = crypto.randomUUID();
    
    const job: Job<T, M> = {
      id: jobId,
      type: options.type,
      status: "QUEUED",
      progress: 0,
      metadata: options.metadata,
    };

    this.jobs.set(jobId, job);

    // Fire and forget execution to avoid blocking the current tick
    setImmediate(() => {
      this.executeJob(jobId, executor);
    });

    return jobId;
  }

  /**
   * Retrieves the current state of a job.
   */
  public getJob<T, M>(jobId: string): Job<T, M> | undefined {
    return this.jobs.get(jobId) as Job<T, M> | undefined;
  }

  /**
   * Cancels a running or queued job.
   */
  public cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status === "COMPLETED" || job.status === "FAILED") {
      return false; // Cannot cancel completed/failed jobs
    }
    
    job.status = "CANCELLED";
    job.endTime = new Date().toISOString();
    return true;
  }

  /**
   * Internal executor wrapper.
   */
  private async executeJob<T>(
    jobId: string,
    executor: (jobId: string, updateProgress: (progress: number) => void) => Promise<T>
  ) {
    const job = this.jobs.get(jobId);
    if (!job || job.status === "CANCELLED") return;

    job.status = "RUNNING";
    job.startTime = new Date().toISOString();

    const updateProgress = (progress: number) => {
      if (job.status === "RUNNING") {
        job.progress = Math.max(0, Math.min(100, progress));
      }
    };

    try {
      const result = await executor(jobId, updateProgress);
      
      const currentJob = this.jobs.get(jobId);
      if (currentJob && currentJob.status !== "CANCELLED") {
        currentJob.status = "COMPLETED";
        currentJob.progress = 100;
        currentJob.result = result;
        currentJob.endTime = new Date().toISOString();
      }
    } catch (error: any) {
      const currentJob = this.jobs.get(jobId);
      if (currentJob && currentJob.status !== "CANCELLED") {
        currentJob.status = "FAILED";
        currentJob.error = error.message || "Unknown error";
        currentJob.endTime = new Date().toISOString();
      }
    }
  }
}

export const defaultBackgroundJobService = new BackgroundJobService();
