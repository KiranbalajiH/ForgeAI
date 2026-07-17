"use client";

import { Repository } from "@/types/repository";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface RepositoryTableProps {
  repositories: Repository[];
}

export default function RepositoryTable({
  repositories,
}: RepositoryTableProps) {
  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Repository</TableHead>
            <TableHead>Language</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Health</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {repositories.map((repo) => (
            <TableRow key={repo.id}>
              <TableCell className="font-medium">
                {repo.name}
              </TableCell>

              <TableCell>{repo.language}</TableCell>

              <TableCell>{repo.status}</TableCell>

              <TableCell className="text-right">
                {repo.health}%
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}