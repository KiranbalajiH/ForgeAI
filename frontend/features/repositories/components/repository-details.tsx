"use client";

import { Repository } from "@/types/repository";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface RepositoryDetailsProps {
  repository: Repository | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RepositoryDetails({
  repository,
  open,
  onOpenChange,
}: RepositoryDetailsProps) {
  if (!repository) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{repository.name}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div>
            <p className="text-sm text-muted-foreground">Language</p>
            <Badge>{repository.language}</Badge>
          </div>

          <Separator />

          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge variant="secondary">{repository.status}</Badge>
          </div>

          <Separator />

          <div>
            <p className="text-sm text-muted-foreground">Health Score</p>
            <h2 className="text-3xl font-bold">
              {repository.health}%
            </h2>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}