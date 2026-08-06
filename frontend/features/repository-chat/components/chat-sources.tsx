"use client";

import Link from "next/link";
import { FileCode2 } from "lucide-react";
import { SourceReference } from "@/services/repository-chat-service";

interface ChatSourcesProps {
  sources: SourceReference[];
  repositoryName?: string;
}

export default function ChatSources({
  sources,
  repositoryName = "",
}: ChatSourcesProps) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 flex flex-col gap-1.5 border-t pt-2 text-xs">
      <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
        <FileCode2 className="h-3.5 w-3.5" />
        <span>Sources ({sources.length})</span>
      </div>

      <div className="flex flex-wrap gap-2 pt-0.5">
        {sources.map((source) => {
          const targetUrl = repositoryName
            ? `/repositories/${encodeURIComponent(repositoryName)}?file=${encodeURIComponent(source.path)}`
            : `/repositories?file=${encodeURIComponent(source.path)}`;

          return (
            <Link
              key={source.path}
              href={targetUrl}
              className="inline-flex items-center gap-1.5 rounded-md border bg-background/80 px-2 py-1 font-mono text-[11px] font-normal transition-colors hover:bg-accent hover:text-accent-foreground"
              title={source.path}
            >
              <span className="font-semibold text-foreground">{source.name}</span>
              <span className="max-w-[180px] truncate text-[10px] text-muted-foreground">
                ({source.path})
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
