"use client";

import Link from "next/link";
import { Repository } from "@/types/repository";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { MessageSquare, Search } from "lucide-react";

interface RepositoryTableProps {
  repositories: Repository[];
  onSelectSearchRepo?: (repoName: string) => void;
}

export default function RepositoryTable({
  repositories,
  onSelectSearchRepo,
}: RepositoryTableProps) {
  return (
    <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Repository</TableHead>
            <TableHead>Language</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Health</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {repositories.map((repo) => (
            <TableRow key={repo.id} className="hover:bg-muted/40 transition-colors">
              <TableCell className="font-semibold text-foreground">
                {repo.name}
              </TableCell>

              <TableCell>
                <Badge variant="outline" className="font-mono text-xs">
                  {repo.language}
                </Badge>
              </TableCell>

              <TableCell>
                <Badge
                  variant={repo.status === "Active" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {repo.status}
                </Badge>
              </TableCell>

              <TableCell className="font-medium">
                <span
                  className={
                    repo.health >= 90
                      ? "text-emerald-500 font-semibold"
                      : repo.health >= 75
                      ? "text-amber-500 font-semibold"
                      : "text-destructive font-semibold"
                  }
                >
                  {repo.health}%
                </span>
              </TableCell>

              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={`/repositories/${encodeURIComponent(repo.name)}/chat`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-primary mr-1.5" />
                    <span>Chat</span>
                  </Link>

                  {onSelectSearchRepo && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onSelectSearchRepo(repo.name)}
                      className="gap-1.5 text-xs h-7"
                    >
                      <Search className="h-3.5 w-3.5" />
                      <span>Search</span>
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}