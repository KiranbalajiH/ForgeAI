"use client";

import { useState, useEffect } from "react";
import {
  Folder,
  FolderOpen,
  FileCode2,
  ChevronRight,
  ChevronDown,
  FolderGit2,
  Loader2,
  AlertCircle,
  FileSearch,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { repositoryService, FileTreeNode } from "@/services/repository-service";
import FileViewerDialog from "./file-viewer-dialog";
import RepositoryStatusBadge from "./repository-status-badge";
import { repositories as mockRepositories } from "@/features/repositories/mock-data";

interface RepositoryFileTreeProps {
  initialRepoName?: string;
  onAskInChat?: (repoName: string, queryText: string) => void;
}

interface TreeNodeItemProps {
  node: FileTreeNode;
  expandedPaths: Set<string>;
  toggleExpand: (path: string) => void;
  onSelectFile: (path: string) => void;
  level?: number;
}

function TreeNodeItem({
  node,
  expandedPaths,
  toggleExpand,
  onSelectFile,
  level = 0,
}: TreeNodeItemProps) {
  const isFolder = node.type === "folder";
  const isExpanded = expandedPaths.has(node.path);

  return (
    <div className="select-none">
      <div
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => {
          if (isFolder) {
            toggleExpand(node.path);
          } else {
            onSelectFile(node.path);
          }
        }}
        className={`flex items-center gap-2 py-1 px-2 rounded-md text-xs font-mono transition-colors cursor-pointer ${
          isFolder
            ? "hover:bg-muted/70 text-foreground font-medium"
            : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
        }`}
      >
        {isFolder ? (
          <>
            <span className="text-muted-foreground shrink-0">
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </span>
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 text-amber-500 shrink-0" />
            ) : (
              <Folder className="h-4 w-4 text-amber-500 shrink-0" />
            )}
            <span className="truncate">{node.name}</span>
          </>
        ) : (
          <>
            <span className="w-3.5 shrink-0" />
            <FileCode2 className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate">{node.name}</span>
          </>
        )}
      </div>

      {isFolder && isExpanded && node.children && node.children.length > 0 && (
        <div className="flex flex-col">
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.path}
              node={child}
              expandedPaths={expandedPaths}
              toggleExpand={toggleExpand}
              onSelectFile={onSelectFile}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function RepositoryFileTree({
  initialRepoName = "ForgeAI",
  onAskInChat,
}: RepositoryFileTreeProps) {
  const [selectedRepo, setSelectedRepo] = useState<string>(initialRepoName);
  const [treeData, setTreeData] = useState<FileTreeNode[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  // File Viewer modal state
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [isFileViewerOpen, setIsFileViewerOpen] = useState<boolean>(false);

  const loadTree = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await repositoryService.getTree(selectedRepo);
      if (response.success && response.data) {
        setTreeData(response.data);
        // Automatically expand top-level folders
        const topFolders = response.data
          .filter((item) => item.type === "folder")
          .map((item) => item.path);
        setExpandedPaths(new Set(topFolders));
      } else {
        setError(response.message || "Failed to load repository file tree.");
        setTreeData(null);
      }
    } catch (err: any) {
      console.error("Repository file tree error:", err);
      const message =
        err?.response?.data?.message || err?.message || "An unexpected error occurred.";
      setError(message);
      setTreeData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTree();
  }, [selectedRepo]);

  const toggleExpand = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleSelectFile = (path: string) => {
    setSelectedFilePath(path);
    setIsFileViewerOpen(true);
  };

  return (
    <div className="space-y-4">
      <Card className="border-border shadow-xs">
        <CardContent className="p-4 md:p-6 space-y-4">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <FolderGit2 className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm text-foreground">{selectedRepo} File Browser</span>
                <Badge variant="outline" className="font-mono text-[11px]">
                  File Tree
                </Badge>
              </div>

              <RepositoryStatusBadge repoName={selectedRepo} />
            </div>

            {/* Repository Selector */}
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-1.5 text-xs font-medium">
              <span className="text-muted-foreground font-sans">Repository:</span>
              <select
                value={selectedRepo}
                onChange={(e) => setSelectedRepo(e.target.value)}
                className="bg-transparent border-0 font-semibold focus:outline-none text-foreground cursor-pointer"
              >
                {mockRepositories.map((repo) => (
                  <option key={repo.id} value={repo.name} className="bg-popover text-popover-foreground">
                    {repo.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <div className="flex-1 text-sm font-medium">{error}</div>
              <Button variant="outline" size="sm" onClick={loadTree}>
                Retry
              </Button>
            </div>
          )}

          {/* Loading Skeleton State */}
          {isLoading && (
            <div className="space-y-2 py-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-6 w-64 ml-4" />
              <Skeleton className="h-6 w-56 ml-4" />
              <Skeleton className="h-6 w-40 ml-8" />
              <Skeleton className="h-6 w-52" />
            </div>
          )}

          {/* Tree View Content */}
          {!isLoading && !error && treeData && (
            treeData.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center gap-2 text-muted-foreground">
                <FileSearch className="h-8 w-8 text-muted-foreground/60" />
                <p className="text-sm font-medium">No files found in repository &quot;{selectedRepo}&quot;.</p>
              </div>
            ) : (
              <div className="rounded-lg border bg-background p-3 max-h-[600px] overflow-auto space-y-0.5">
                {treeData.map((node) => (
                  <TreeNodeItem
                    key={node.path}
                    node={node}
                    expandedPaths={expandedPaths}
                    toggleExpand={toggleExpand}
                    onSelectFile={handleSelectFile}
                  />
                ))}
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* Code Viewer Dialog */}
      <FileViewerDialog
        repoName={selectedRepo}
        filePath={selectedFilePath}
        isOpen={isFileViewerOpen}
        onOpenChange={setIsFileViewerOpen}
        onAskInChat={onAskInChat}
      />
    </div>
  );
}
