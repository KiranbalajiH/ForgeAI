"use client";

import { useMemo, useState } from "react";
import PageTemplate from "@/components/common/page-template";
import RepositorySearch, { RepositoryCodeSearch } from "@/features/repositories/components/repository-search";
import RepositoryTable from "@/features/repositories/components/repository-table";
import { repositories } from "@/features/repositories/mock-data";
import { Search, FolderGit2 } from "lucide-react";

export default function RepositoriesPage() {
  const [activeTab, setActiveTab] = useState<"code" | "repositories">("code");
  const [selectedSearchRepo, setSelectedSearchRepo] = useState<string>("ForgeAI");
  const [search, setSearch] = useState("");

  const filteredRepositories = useMemo(() => {
    return repositories.filter((repo) =>
      repo.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const handleSelectSearchRepo = (repoName: string) => {
    setSelectedSearchRepo(repoName);
    setActiveTab("code");
  };

  return (
    <PageTemplate
      title="Repositories"
      description="Search indexed repository code, manage repositories, and analyze codebase structure."
    >
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b pb-2">
          <button
            onClick={() => setActiveTab("code")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === "code"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <Search className="h-4 w-4" />
            <span>Code Search</span>
          </button>

          <button
            onClick={() => setActiveTab("repositories")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === "repositories"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <FolderGit2 className="h-4 w-4" />
            <span>All Repositories ({repositories.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "code" ? (
          <RepositoryCodeSearch initialRepoName={selectedSearchRepo} />
        ) : (
          <div className="space-y-6">
            <RepositorySearch
              mode="filter"
              value={search}
              onChange={setSearch}
            />

            <RepositoryTable
              repositories={filteredRepositories}
              onSelectSearchRepo={handleSelectSearchRepo}
            />
          </div>
        )}
      </div>
    </PageTemplate>
  );
}