"use client";

import { useState, useMemo, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Loader2,
  FileCode2,
  Code2,
  Server,
  Layers,
  Route,
  Database,
  Sparkles,
  AlertCircle,
  FolderGit2,
  ExternalLink,
  Copy,
  Check,
  MessageSquare,
  Activity,
  Code,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  repositorySearchService,
  SearchMatch,
  SearchResult,
} from "@/services/repository-search-service";
import MarkdownRenderer from "@/features/repository-chat/components/markdown-renderer";
import { repositories as mockRepositories } from "@/features/repositories/mock-data";

interface RepositoryCodeSearchProps {
  initialRepoName?: string;
  onAskInChat?: (repoName: string, queryText: string) => void;
}

type CategoryType = "all" | "files" | "symbols" | "controllers" | "services" | "routes" | "models";

export default function RepositoryCodeSearch({
  initialRepoName = "ForgeAI",
  onAskInChat,
}: RepositoryCodeSearchProps) {
  const router = useRouter();
  const [selectedRepo, setSelectedRepo] = useState<string>(initialRepoName);
  const [query, setQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<CategoryType>("all");

  // Context viewer modal state
  const [selectedMatch, setSelectedMatch] = useState<SearchMatch | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState<boolean>(false);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  // Selected repository details
  const activeRepoDetail = useMemo(() => {
    return mockRepositories.find((r) => r.name.toLowerCase() === selectedRepo.toLowerCase()) || mockRepositories[0];
  }, [selectedRepo]);

  const handleSearch = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const response = await repositorySearchService.search({
        repository: selectedRepo,
        query: query.trim(),
      });

      if (response.success && response.results) {
        setSearchResult(response.results);
      } else {
        setError(response.message || "Failed to execute repository search.");
        setSearchResult(null);
      }
    } catch (err: any) {
      console.error("Repository code search error:", err);
      const message =
        err?.response?.data?.message || err?.message || "An unexpected error occurred during search.";
      setError(message);
      setSearchResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Flattened results for "all" or specific category
  const filteredMatches = useMemo(() => {
    if (!searchResult) return [];

    const categories: Record<Exclude<CategoryType, "all">, SearchMatch[]> = {
      files: searchResult.files || [],
      symbols: searchResult.symbols || [],
      controllers: searchResult.controllers || [],
      services: searchResult.services || [],
      routes: searchResult.routes || [],
      models: searchResult.models || [],
    };

    if (activeCategory === "all") {
      const all = Object.values(categories).flat();
      const uniqueMap = new Map<string, SearchMatch>();
      all.forEach((item) => {
        const existing = uniqueMap.get(item.id);
        if (!existing || item.score > existing.score) {
          uniqueMap.set(item.id, item);
        }
      });
      return Array.from(uniqueMap.values()).sort((a, b) => b.score - a.score);
    }

    return categories[activeCategory] || [];
  }, [searchResult, activeCategory]);

  const categoryCounts = useMemo(() => {
    if (!searchResult) return { all: 0, files: 0, symbols: 0, controllers: 0, services: 0, routes: 0, models: 0 };
    return {
      all:
        (searchResult.files?.length || 0) +
        (searchResult.symbols?.length || 0) +
        (searchResult.controllers?.length || 0) +
        (searchResult.services?.length || 0) +
        (searchResult.routes?.length || 0) +
        (searchResult.models?.length || 0),
      files: searchResult.files?.length || 0,
      symbols: searchResult.symbols?.length || 0,
      controllers: searchResult.controllers?.length || 0,
      services: searchResult.services?.length || 0,
      routes: searchResult.routes?.length || 0,
      models: searchResult.models?.length || 0,
    };
  }, [searchResult]);

  const openContextViewer = (match: SearchMatch) => {
    setSelectedMatch(match);
    setIsViewerOpen(true);
  };

  const handleAskInChat = (match: SearchMatch) => {
    const path = match.filePath || match.name;
    const promptText = `Explain how ${match.name} works in ${path}`;

    if (onAskInChat) {
      onAskInChat(selectedRepo, promptText);
    } else {
      router.push(`/repositories/${encodeURIComponent(selectedRepo)}/chat?ask=${encodeURIComponent(promptText)}`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(text);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const getCategoryIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "controller":
        return <Server className="h-3.5 w-3.5 text-blue-500" />;
      case "service":
        return <Layers className="h-3.5 w-3.5 text-purple-500" />;
      case "apiroute":
      case "route":
        return <Route className="h-3.5 w-3.5 text-emerald-500" />;
      case "databasemodel":
      case "model":
        return <Database className="h-3.5 w-3.5 text-amber-500" />;
      case "symbol":
        return <Code2 className="h-3.5 w-3.5 text-cyan-500" />;
      default:
        return <FileCode2 className="h-3.5 w-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Repository Context Bar & Search Input Card */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-4 md:p-6 space-y-4">
          {/* Top Repository Summary Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 text-xs">
            <div className="flex items-center gap-2">
              <FolderGit2 className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm text-foreground">{activeRepoDetail.name}</span>
              <Badge variant="outline" className="font-mono text-[11px]">
                {activeRepoDetail.language}
              </Badge>
              <Badge
                variant={activeRepoDetail.status === "Active" ? "default" : "secondary"}
                className="text-[10px]"
              >
                {activeRepoDetail.status}
              </Badge>
            </div>

            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="flex items-center gap-1">
                <Activity className="h-3.5 w-3.5 text-emerald-500" />
                <span>Health Score: <strong className="text-foreground">{activeRepoDetail.health}%</strong></span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/repositories/${encodeURIComponent(selectedRepo)}/chat`)}
                className="h-7 gap-1.5 text-xs text-primary hover:text-primary"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Open Repository Chat</span>
              </Button>
            </div>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Repository Selector */}
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs font-medium shrink-0">
              <FolderGit2 className="h-4 w-4 text-muted-foreground" />
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

            {/* Query Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search indexed repository code (e.g., auth, controller, route)..."
                className="pl-9 pr-4 text-sm"
              />
            </div>

            {/* Search Submit Button */}
            <Button type="submit" disabled={isLoading || !query.trim()} className="gap-2 shrink-0">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  <span>Search Code</span>
                </>
              )}
            </Button>
          </form>

          {/* Quick Query Hints */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-1">
            <span className="font-medium">Quick searches:</span>
            {["authentication", "controller", "chat service", "routes"].map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => {
                  setQuery(sample);
                  setTimeout(() => {
                    repositorySearchService
                      .search({ repository: selectedRepo, query: sample })
                      .then((res) => {
                        if (res.success && res.results) {
                          setSearchResult(res.results);
                          setHasSearched(true);
                        }
                      })
                      .catch((err) => console.error(err));
                  }, 0);
                }}
                className="rounded-full border bg-muted/30 px-2.5 py-0.5 text-[11px] font-mono hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
              >
                {sample}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* API Error State */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div className="flex-1 text-sm font-medium">{error}</div>
          <Button variant="outline" size="sm" onClick={() => handleSearch()}>
            Retry
          </Button>
        </div>
      )}

      {/* Loading Skeleton State */}
      {isLoading && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          {[1, 2, 3].map((i) => (
            <Card key={i} className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-16 w-full rounded-md" />
            </Card>
          ))}
        </div>
      )}

      {/* Search Results Content */}
      {!isLoading && searchResult && (
        <div className="space-y-4">
          {/* Header Bar with Intent & Category Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                Results for &quot;{query}&quot;
              </span>
              <Badge variant="secondary" className="text-xs">
                {categoryCounts.all} matches
              </Badge>

              {searchResult.intent && (
                <Badge variant="outline" className="gap-1 border-primary/40 bg-primary/5 text-primary text-xs">
                  <Sparkles className="h-3 w-3" />
                  <span>Intent: {searchResult.intent}</span>
                </Badge>
              )}
            </div>

            {/* Category Tabs */}
            <div className="flex flex-wrap gap-1 text-xs">
              {(
                [
                  { id: "all", label: "All", count: categoryCounts.all },
                  { id: "files", label: "Files", count: categoryCounts.files },
                  { id: "controllers", label: "Controllers", count: categoryCounts.controllers },
                  { id: "services", label: "Services", count: categoryCounts.services },
                  { id: "routes", label: "Routes", count: categoryCounts.routes },
                  { id: "models", label: "Models", count: categoryCounts.models },
                  { id: "symbols", label: "Symbols", count: categoryCounts.symbols },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  disabled={cat.count === 0 && cat.id !== "all"}
                  className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                    activeCategory === cat.id
                      ? "bg-primary text-primary-foreground"
                      : cat.count === 0
                      ? "opacity-40 cursor-not-allowed text-muted-foreground"
                      : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                  }`}
                >
                  {cat.label} ({cat.count})
                </button>
              ))}
            </div>
          </div>

          {/* Empty Results State */}
          {filteredMatches.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-base font-semibold">No code matches found</h3>
                <p className="max-w-md text-sm text-muted-foreground">
                  We couldn&apos;t find any code matches for &quot;{query}&quot; in repository &quot;{selectedRepo}&quot;. Try adjusting your keywords or selecting another category.
                </p>
              </div>
            </Card>
          ) : (
            /* Matches List */
            <div className="space-y-3">
              {filteredMatches.map((match) => {
                const pathDisplay = match.filePath || match.name;
                const scorePercentage = Math.round(match.score * 100);

                return (
                  <Card
                    key={match.id}
                    className="group border-border transition-all hover:border-primary/50 hover:shadow-xs"
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          {getCategoryIcon(match.type)}
                          <span className="font-semibold text-sm text-foreground truncate">
                            {match.name}
                          </span>
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-mono">
                            {match.type}
                          </Badge>
                        </div>

                        {/* Relevance Score & Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                              scorePercentage >= 80
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : scorePercentage >= 50
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "bg-muted text-muted-foreground"
                            }`}
                            title={`Relevance Score: ${match.score}`}
                          >
                            Score: {scorePercentage}%
                          </span>

                          {/* Ask AI in Chat Action */}
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleAskInChat(match)}
                            className="gap-1.5 text-xs h-7"
                          >
                            <MessageSquare className="h-3 w-3" />
                            <span>Ask AI</span>
                          </Button>

                          {/* Open Context Action */}
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openContextViewer(match)}
                            className="gap-1.5 text-xs h-7"
                          >
                            <span>Open Context</span>
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* File path */}
                      {pathDisplay && (
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground font-mono">
                          <Code className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                          <span className="truncate">{pathDisplay}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(pathDisplay)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground cursor-pointer"
                            title="Copy file path"
                          >
                            {copiedPath === pathDisplay ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      )}
                    </CardHeader>

                    {/* Content Preview */}
                    <CardContent className="p-4 pt-1">
                      <div className="rounded-lg bg-zinc-950 p-3 font-mono text-xs text-zinc-300 max-h-36 overflow-hidden relative">
                        <pre className="whitespace-pre-wrap break-words">
                          {match.content.length > 300
                            ? `${match.content.substring(0, 300)}...`
                            : match.content}
                        </pre>
                        {match.content.length > 300 && (
                          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-zinc-950 to-transparent flex items-end justify-center pb-1">
                            <button
                              type="button"
                              onClick={() => openContextViewer(match)}
                              className="text-[11px] text-primary hover:underline font-sans font-medium cursor-pointer"
                            >
                              Show full context
                            </button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Initial Empty Prompt State */}
      {!isLoading && !hasSearched && (
        <Card className="p-8 text-center border-dashed">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold">Search Code Across Repository</h3>
            <p className="max-w-md text-sm text-muted-foreground">
              Enter keywords or entity names above to search indexed files, controllers, services, API routes, database models, and symbols in &quot;{selectedRepo}&quot;.
            </p>
          </div>
        </Card>
      )}

      {/* Source Context Viewer Modal (Dialog) */}
      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6">
          <DialogHeader className="border-b pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                {selectedMatch && getCategoryIcon(selectedMatch.type)}
                <DialogTitle className="text-base font-mono truncate">
                  {selectedMatch?.name}
                </DialogTitle>
                {selectedMatch && (
                  <Badge variant="outline" className="text-xs uppercase font-mono shrink-0">
                    {selectedMatch.type}
                  </Badge>
                )}
              </div>

              {selectedMatch && (
                <Button
                  size="sm"
                  onClick={() => {
                    setIsViewerOpen(false);
                    handleAskInChat(selectedMatch);
                  }}
                  className="gap-1.5 text-xs shrink-0"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Ask AI in Chat</span>
                </Button>
              )}
            </div>
            <DialogDescription className="text-xs font-mono text-muted-foreground">
              {selectedMatch?.filePath || selectedMatch?.name} &bull; Score: {selectedMatch ? Math.round(selectedMatch.score * 100) : 0}%
            </DialogDescription>
          </DialogHeader>

          {/* Dialog Body with Code Syntax Highlighting */}
          <div className="flex-1 overflow-auto py-4">
            {selectedMatch ? (
              <MarkdownRenderer
                content={`\`\`\`typescript\n${selectedMatch.content}\n\`\`\``}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
