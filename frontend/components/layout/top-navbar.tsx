"use client";

import { Bell, Search, UserCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function TopNavbar() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="flex w-full max-w-md items-center gap-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search repositories, files, or AI insights..."
          className="border-0 shadow-none focus-visible:ring-0"
        />
      </div>

      <div className="flex items-center gap-5">
        <Bell className="h-5 w-5 cursor-pointer text-muted-foreground hover:text-foreground" />
        <UserCircle2 className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground" />
      </div>
    </header>
  );
}