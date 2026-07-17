"use client";

import { Input } from "@/components/ui/input";

interface RepositorySearchProps {
  value: string;
  onChange: (value: string) => void;
}

export default function RepositorySearch({
  value,
  onChange,
}: RepositorySearchProps) {
  return (
    <Input
      placeholder="Search repositories..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}