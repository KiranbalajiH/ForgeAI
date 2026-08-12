"use client";

import { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileCode2, AlertCircle, MessageSquare, Target } from "lucide-react";
import { repositoryService } from "@/services/repository-service";

interface FileViewerDialogProps {
  repoName: string;
  filePath: string | null;
  lineNumber?: number | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAskInChat?: (repoName: string, queryText: string) => void;
}

export default function FileViewerDialog({
  repoName,
  filePath,
  lineNumber,
  isOpen,
  onOpenChange,
  onAskInChat,
}: FileViewerDialogProps) {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const targetLineRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen && filePath && repoName) {
      const loadFile = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const res = await repositoryService.getFile(repoName, filePath);
          if (res.success) {
            setContent(res.content || "");
          } else {
            setError(res.message || "Failed to load file.");
          }
        } catch (err: any) {
          setError(
            err?.response?.data?.message || err?.message || "An unexpected error occurred."
          );
        } finally {
          setIsLoading(false);
        }
      };
      loadFile();
    } else {
      setContent(null);
      setError(null);
    }
  }, [isOpen, filePath, repoName]);

  // Scroll to target line when content finishes loading
  useEffect(() => {
    if (!isLoading && content !== null && targetLineRef.current) {
      setTimeout(() => {
        targetLineRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);
    }
  }, [isLoading, content, lineNumber]);

  const lines = content !== null ? content.split("\n") : [];
  const isLineValid =
    typeof lineNumber === "number" &&
    lineNumber >= 1 &&
    lineNumber <= lines.length;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <FileCode2 className="h-4 w-4 text-primary shrink-0" />
              <DialogTitle className="text-base font-mono truncate">
                {filePath?.split("/").pop() || filePath}
              </DialogTitle>

              {typeof lineNumber === "number" && (
                <Badge
                  variant={isLineValid ? "default" : "destructive"}
                  className="text-xs font-mono gap-1"
                >
                  <Target className="h-3 w-3" />
                  {isLineValid ? `Line ${lineNumber}` : `Line ${lineNumber} (Invalid)`}
                </Badge>
              )}
            </div>

            {onAskInChat && filePath && (
              <Button
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  const prompt = lineNumber
                    ? `Explain code around line ${lineNumber} in ${filePath}`
                    : `Explain the file ${filePath}`;
                  onAskInChat(repoName, prompt);
                }}
                className="gap-1.5 text-xs shrink-0"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Ask AI</span>
              </Button>
            )}
          </div>
          <DialogDescription className="text-xs font-mono text-muted-foreground truncate">
            {filePath}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4 relative min-h-[250px] bg-zinc-950 rounded-lg border border-zinc-800 text-zinc-200">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground bg-zinc-950/80 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-mono">Loading file contents...</p>
            </div>
          )}

          {error && (
            <div className="m-4 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <div className="flex-1 text-sm font-medium">{error}</div>
            </div>
          )}

          {!isLoading && !error && content !== null && (
            lines.length === 0 || (lines.length === 1 && lines[0] === "") ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500 italic text-sm py-12">
                This file is empty.
              </div>
            ) : (
              <div className="font-mono text-xs leading-relaxed select-text py-2">
                {lines.map((lineText, idx) => {
                  const currentLineNum = idx + 1;
                  const isHighlighted = isLineValid && currentLineNum === lineNumber;

                  return (
                    <div
                      key={idx}
                      ref={isHighlighted ? targetLineRef : undefined}
                      className={`flex items-start px-3 py-0.5 transition-colors ${
                        isHighlighted
                          ? "bg-primary/20 text-white font-semibold border-l-4 border-primary pl-2"
                          : "hover:bg-zinc-900/60"
                      }`}
                    >
                      {/* Line Number Gutter */}
                      <span className="w-12 shrink-0 select-none text-right pr-4 text-zinc-600 font-mono text-[11px]">
                        {currentLineNum}
                      </span>
                      {/* Code Content */}
                      <span className="flex-1 whitespace-pre break-words font-mono">
                        {lineText || " "}
                      </span>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
