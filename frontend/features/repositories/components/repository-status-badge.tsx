"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  Loader2,
  RefreshCw,
  AlertCircle,
  Clock,
  Play,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  repositoryService,
  RepositoryIndexStatus,
  RepositoryIndexState,
} from "@/services/repository-service";

interface RepositoryStatusBadgeProps {
  repoName: string;
  compact?: boolean;
  onStatusChange?: (status: RepositoryIndexStatus) => void;
}

export default function RepositoryStatusBadge({
  repoName,
  compact = false,
  onStatusChange,
}: RepositoryStatusBadgeProps) {
  const [statusInfo, setStatusInfo] = useState<RepositoryIndexStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isIndexing, setIsIndexing] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setActionError(null);
    try {
      const res = await repositoryService.getIndexStatus(repoName);
      if (res.success && res.data) {
        setStatusInfo(res.data);
        if (onStatusChange) onStatusChange(res.data);
      } else {
        const defaultStatus: RepositoryIndexStatus = {
          repository: repoName,
          status: "NOT_INDEXED",
          lastSuccessfulIndexTime: null,
          lastAttemptedIndexTime: null,
          indexError: null,
        };
        setStatusInfo(defaultStatus);
      }
    } catch (err: any) {
      console.error("Failed to fetch repository index status:", err);
    } finally {
      setLoading(false);
    }
  }, [repoName, onStatusChange]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleTriggerIndex = async (simulateFailure = false) => {
    setIsIndexing(true);
    setActionError(null);

    setStatusInfo((prev) => ({
      repository: repoName,
      status: "INDEXING",
      lastSuccessfulIndexTime: prev?.lastSuccessfulIndexTime || null,
      lastAttemptedIndexTime: new Date().toISOString(),
      indexError: null,
    }));

    try {
      const res = await repositoryService.triggerIndex(repoName, simulateFailure);
      if (res.success && res.status) {
        setStatusInfo(res.status);
        if (onStatusChange) onStatusChange(res.status);
      } else if (res.status) {
        setStatusInfo(res.status);
        setActionError(res.message || "Indexing attempt failed");
      } else {
        await fetchStatus();
      }
    } catch (err: any) {
      console.error("Trigger index error:", err);
      setActionError(err?.message || "Failed to trigger indexing");
      await fetchStatus();
    } finally {
      setIsIndexing(false);
    }
  };

  if (loading && !statusInfo) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Checking status...</span>
      </div>
    );
  }

  const state: RepositoryIndexState = statusInfo?.status || "NOT_INDEXED";

  const renderStateBadge = () => {
    switch (state) {
      case "INDEXED":
        return (
          <Badge
            variant="outline"
            className="gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-medium text-[11px] py-0.5 px-2"
          >
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            <span>Ready</span>
          </Badge>
        );

      case "INDEXING":
        return (
          <Badge
            variant="outline"
            className="gap-1 bg-blue-500/10 text-blue-600 border-blue-500/30 font-medium text-[11px] py-0.5 px-2"
          >
            <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
            <span>Indexing...</span>
          </Badge>
        );

      case "STALE":
        return (
          <Badge
            variant="outline"
            className="gap-1 bg-amber-500/10 text-amber-600 border-amber-500/30 font-medium text-[11px] py-0.5 px-2"
          >
            <RefreshCw className="h-3 w-3 text-amber-500" />
            <span>Needs Indexing</span>
          </Badge>
        );

      case "FAILED":
        return (
          <Badge
            variant="destructive"
            className="gap-1 font-medium text-[11px] py-0.5 px-2"
          >
            <AlertCircle className="h-3 w-3" />
            <span>Index Failed</span>
          </Badge>
        );

      case "NOT_INDEXED":
      default:
        return (
          <Badge
            variant="secondary"
            className="gap-1 font-medium text-[11px] py-0.5 px-2 text-muted-foreground"
          >
            <Clock className="h-3 w-3" />
            <span>Not Indexed</span>
          </Badge>
        );
    }
  };

  const formattedLastIndex = statusInfo?.lastSuccessfulIndexTime
    ? new Date(statusInfo.lastSuccessfulIndexTime).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {renderStateBadge()}
        {state !== "INDEXING" && (
          <Button
            variant="ghost"
            size="sm"
            disabled={isIndexing}
            onClick={() => handleTriggerIndex(false)}
            className="h-6 px-2 text-[11px] gap-1"
          >
            {state === "INDEXED" ? (
              <RefreshCw className="h-3 w-3" />
            ) : (
              <Play className="h-3 w-3" />
            )}
            <span>{state === "INDEXED" ? "Re-index" : "Index"}</span>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5 text-xs">
      <div className="flex items-center gap-1.5">
        <span className="font-medium text-muted-foreground">Index Status:</span>
        {renderStateBadge()}
      </div>

      {formattedLastIndex && (
        <span className="text-[11px] text-muted-foreground">
          (Last synced: {formattedLastIndex})
        </span>
      )}

      {statusInfo?.indexError && state === "FAILED" && (
        <span className="text-[11px] text-destructive truncate max-w-[200px]" title={statusInfo.indexError}>
          Error: {statusInfo.indexError}
        </span>
      )}

      {actionError && (
        <span className="text-[11px] text-destructive truncate max-w-[180px]">
          {actionError}
        </span>
      )}

      {state !== "INDEXING" && (
        <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
          <Button
            variant={state === "STALE" || state === "NOT_INDEXED" || state === "FAILED" ? "default" : "outline"}
            size="sm"
            disabled={isIndexing}
            onClick={() => handleTriggerIndex(false)}
            className="h-7 px-2.5 text-xs gap-1.5 shadow-2xs cursor-pointer"
          >
            {isIndexing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : state === "INDEXED" ? (
              <RefreshCw className="h-3.5 w-3.5 text-primary" />
            ) : state === "STALE" ? (
              <RefreshCw className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            <span>
              {state === "INDEXED"
                ? "Re-index Repo"
                : state === "STALE"
                ? "Sync Index"
                : state === "FAILED"
                ? "Retry Indexing"
                : "Index Repo"}
            </span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            disabled={isIndexing}
            onClick={() => handleTriggerIndex(true)}
            title="Simulate Index Failure (For Verification)"
            className="h-7 px-1.5 text-[10px] text-muted-foreground hover:text-destructive cursor-pointer"
          >
            <Zap className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
