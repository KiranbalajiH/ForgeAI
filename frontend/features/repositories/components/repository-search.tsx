"use client";

import { Input } from "@/components/ui/input";
import RepositoryCodeSearch from "./repository-code-search";

interface RepositorySearchProps {
  value?: string;
  onChange?: (value: string) => void;
  mode?: "filter" | "code";
  initialRepoName?: string;
}

export default function RepositorySearch({
  value,
  onChange,
  mode = "filter",
  initialRepoName = "ForgeAI",
}: RepositorySearchProps) {
  if (mode === "code" || (!value && !onChange)) {
    return <RepositoryCodeSearch initialRepoName={initialRepoName} />;
  }

  return (
    <Input
      placeholder="Search repositories..."
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
}

export { RepositoryCodeSearch };