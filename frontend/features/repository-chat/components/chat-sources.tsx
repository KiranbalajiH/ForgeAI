"use client";

import { FileText, Globe, Code } from "lucide-react";
import { SourceReference } from "@/services/repository-chat-service";
import { Badge } from "@/components/ui/badge";

interface ChatSourcesProps {
  sources: SourceReference[];
  repositoryName?: string;
  onSourceClick?: (path: string, lineNumber?: number) => void;
}

export default function ChatSources({ sources }: ChatSourcesProps) {
  if (!sources || sources.length === 0) return null;

  const getSourceIcon = (type?: string) => {
    switch (type) {
      case "web":
        return <Globe className="h-3 w-3 text-blue-500" />;
      case "api":
        return <Code className="h-3 w-3 text-purple-500" />;
      default:
        return <FileText className="h-3 w-3 text-emerald-500" />;
    }
  };

  const getSourceLabel = (type?: string) => {
    switch (type) {
      case "web":
        return "Web";
      case "api":
        return "API";
      default:
        return "Knowledge Base";
    }
  };

  return (
    <div className="mt-3 flex flex-col gap-1.5 border-t pt-2 text-xs">
      <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
        <FileText className="h-3.5 w-3.5" />
        <span>Sources ({sources.length})</span>
      </div>

      <div className="flex flex-wrap gap-2 pt-0.5">
        {sources.map((source, index) => {
          const type = source.type || "vector";
          return (
            <div
              key={`${source.path}-${index}`}
              className="inline-flex items-center gap-1.5 rounded-md border bg-background/80 px-2.5 py-1 text-[11px] font-normal transition-colors"
              title={source.name}
            >
              <span className="font-semibold text-foreground flex items-center gap-1">
                {getSourceIcon(type)}
                {source.name}
              </span>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono text-muted-foreground">
                {getSourceLabel(type)}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
