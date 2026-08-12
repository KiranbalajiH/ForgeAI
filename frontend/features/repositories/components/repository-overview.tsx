"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  repositoryService,
  RepositoryOverviewResponse,
  RepositoryIndexState,
} from "@/services/repository-service";
import {
  Loader2,
  RefreshCw,
  Play,
  AlertCircle,
  Clock,
  Compass,
  Cpu,
  Layers,
  FileCode,
  Sparkles,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import MarkdownRenderer from "@/features/repository-chat/components/markdown-renderer";

interface RepositoryOverviewProps {
  repositoryName: string;
  onAskInChat?: (repoName: string, promptText: string) => void;
}

export default function RepositoryOverview({
  repositoryName,
  onAskInChat,
}: RepositoryOverviewProps) {
  const [data, setData] = useState<RepositoryOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchOverview = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await repositoryService.getOverview(repositoryName);
      setData(res);
    } catch (err) {
      console.error("Failed to load repository overview:", err);
    } finally {
      setIsLoading(false);
    }
  }, [repositoryName]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const handleRegenerate = async () => {
    setIsRefreshing(true);
    try {
      await repositoryService.triggerIndex(repositoryName);
      await fetchOverview();
    } catch (err) {
      console.error("Failed to regenerate overview:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-sm">Analyzing repository evidence for overview...</span>
      </div>
    );
  }

  const status: string = data?.status || "NOT_INDEXED";

  // NOT_INDEXED State
  if (status === "NOT_INDEXED" || !data?.success) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-4 text-center rounded-lg border border-dashed bg-muted/20">
        <Clock className="h-8 w-8 text-muted-foreground" />
        <div className="space-y-1">
          <h4 className="font-semibold text-base">Repository Not Indexed</h4>
          <p className="text-xs text-muted-foreground max-w-md">
            Repository &quot;{repositoryName}&quot; must be indexed before an evidence-grounded overview can be generated.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            repositoryService.triggerIndex(repositoryName);
            fetchOverview();
          }}
          className="gap-2 cursor-pointer"
        >
          <Play className="h-3.5 w-3.5" />
          <span>Index Repository</span>
        </Button>
      </div>
    );
  }

  // INDEXING State
  if (status === "INDEXING") {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-4 text-center rounded-lg border bg-blue-500/10 border-blue-500/20 text-blue-600">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <div className="space-y-1">
          <h4 className="font-semibold text-base">Indexing in Progress</h4>
          <p className="text-xs text-muted-foreground max-w-md">
            Overview is currently analyzing files for &quot;{repositoryName}&quot;. It will be ready once indexing completes.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchOverview()} className="gap-2 text-xs">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Check Status</span>
        </Button>
      </div>
    );
  }

  // FAILED State
  if (status === "FAILED") {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-4 text-center rounded-lg border border-destructive/30 bg-destructive/10 text-destructive">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <div className="space-y-1">
          <h4 className="font-semibold text-base">Overview Unavailable</h4>
          <p className="text-xs text-muted-foreground max-w-md">
            {data?.message || "Indexing attempt failed for this repository."}
          </p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            repositoryService.triggerIndex(repositoryName);
            fetchOverview();
          }}
          className="gap-2 cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Retry Indexing</span>
        </Button>
      </div>
    );
  }

  const analysis = data?.analysis;
  if (!analysis) {
    return (
      <div className="p-4 text-sm text-muted-foreground text-center">
        No repository overview data available.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 text-sm">
      {/* STALE Warning Banner */}
      {status === "STALE" && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 shrink-0 text-amber-500" />
            <span>Overview may be based on an older repository state.</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={isRefreshing}
            className="h-7 px-2 text-xs border-amber-500/40 hover:bg-amber-500/20 cursor-pointer"
          >
            {isRefreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : "Refresh"}
          </Button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-base">Repository Summary</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono">
              {analysis.totalFiles} files
            </Badge>
            <Badge variant="secondary" className="text-xs font-semibold">
              Complexity: {analysis.estimatedComplexity}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRegenerate}
              disabled={isRefreshing}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              title="Regenerate Overview"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground text-xs leading-relaxed">
          {analysis.overview}
        </p>
      </div>

      {/* Tech Stack Breakdown */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 font-medium text-xs text-muted-foreground uppercase tracking-wider">
          <Cpu className="h-3.5 w-3.5 text-primary" />
          <span>Technology Stack & Tooling</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-2.5 rounded-lg border bg-background flex flex-col gap-1">
            <span className="text-[11px] text-muted-foreground">Language</span>
            <span className="font-semibold text-xs truncate">{analysis.technologies.language}</span>
          </div>
          <div className="p-2.5 rounded-lg border bg-background flex flex-col gap-1">
            <span className="text-[11px] text-muted-foreground">Framework</span>
            <span className="font-semibold text-xs truncate">{analysis.technologies.framework}</span>
          </div>
          <div className="p-2.5 rounded-lg border bg-background flex flex-col gap-1">
            <span className="text-[11px] text-muted-foreground">Build System</span>
            <span className="font-semibold text-xs truncate">{analysis.buildSystem}</span>
          </div>
          <div className="p-2.5 rounded-lg border bg-background flex flex-col gap-1">
            <span className="text-[11px] text-muted-foreground">Package Manager</span>
            <span className="font-semibold text-xs truncate">{analysis.technologies.packageManager}</span>
          </div>
        </div>
      </div>

      {/* Architecture & Code Map */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 font-medium text-xs text-muted-foreground uppercase tracking-wider">
          <Layers className="h-3.5 w-3.5 text-primary" />
          <span>Architecture & Key Modules</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Major Modules */}
          <div className="p-3 rounded-lg border bg-background space-y-2">
            <span className="text-xs font-semibold text-foreground">Top-Level Modules</span>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {analysis.majorModules.length > 0 ? (
                analysis.majorModules.map((mod) => (
                  <Badge key={mod} variant="secondary" className="text-[11px] font-mono">
                    {mod}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground italic">No distinct sub-modules detected</span>
              )}
            </div>
          </div>

          {/* Entry Points */}
          <div className="p-3 rounded-lg border bg-background space-y-2">
            <span className="text-xs font-semibold text-foreground">Detected Entry Points</span>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {analysis.entryPoints.length > 0 ? (
                analysis.entryPoints.map((ep) => (
                  <Badge key={ep} variant="outline" className="text-[11px] font-mono text-primary border-primary/30">
                    {ep}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground italic">Standard entry point</span>
              )}
            </div>
          </div>
        </div>

        {/* Layer Breakdown */}
        <div className="p-3 rounded-lg border bg-background space-y-2">
          <span className="text-xs font-semibold text-foreground">Architectural Layers</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
            <div>
              <span className="text-muted-foreground text-[11px]">Routes:</span>{" "}
              <span className="font-mono">{analysis.architecture.routes.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-[11px]">Controllers:</span>{" "}
              <span className="font-mono">{analysis.architecture.controllers.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-[11px]">Services:</span>{" "}
              <span className="font-mono">{analysis.architecture.services.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-[11px]">Middleware:</span>{" "}
              <span className="font-mono">{analysis.architecture.middleware.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-[11px]">Models/Schemas:</span>{" "}
              <span className="font-mono">{analysis.architecture.models.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-[11px]">Auth Component:</span>{" "}
              <span className="font-mono text-primary">{analysis.technologies.authentication}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Config Files */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 font-medium text-xs text-muted-foreground uppercase tracking-wider">
          <FileCode className="h-3.5 w-3.5 text-primary" />
          <span>Detected Config & Manifests</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {analysis.configFiles.map((cfg) => (
            <Badge key={cfg} variant="outline" className="text-[11px] font-mono">
              {cfg}
            </Badge>
          ))}
        </div>
      </div>

      {/* AI Recommendations */}
      {analysis.aiRecommendations && (
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between gap-2 border-b pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h4 className="font-semibold text-xs uppercase tracking-wider text-foreground">
                Grounded AI Insights & Recommendations
              </h4>
            </div>
            {onAskInChat && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  onAskInChat(
                    repositoryName,
                    `Explain the architecture and recommendations for ${repositoryName}`
                  )
                }
                className="h-6 px-2 text-xs text-primary gap-1 cursor-pointer"
              >
                <span>Ask in Chat</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </div>
          <div className="text-xs prose prose-sm dark:prose-invert max-w-none">
            <MarkdownRenderer content={analysis.aiRecommendations} />
          </div>
        </div>
      )}
    </div>
  );
}
