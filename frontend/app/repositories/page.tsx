"use client";

import { useMemo, useState } from "react";

import PageTemplate from "@/components/common/page-template";
import RepositorySearch from "@/features/repositories/components/repository-search";
import RepositoryTable from "@/features/repositories/components/repository-table";
import { repositories } from "@/features/repositories/mock-data";

export default function RepositoriesPage() {
  const [search, setSearch] = useState("");

  const filteredRepositories = useMemo(() => {
    return repositories.filter((repo) =>
      repo.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  return (
    <PageTemplate
      title="Repositories"
      description="Manage and analyze your repositories."
    >
      <div className="space-y-6">
        <RepositorySearch
          value={search}
          onChange={setSearch}
        />

        <RepositoryTable
          repositories={filteredRepositories}
        />
      </div>
    </PageTemplate>
  );
}