"use client";

import { Bell, Menu, Search, UserCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface TopNavbarProps {
  onMenuClick: () => void;
}

export default function TopNavbar({
  onMenuClick,
}: TopNavbarProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
      {/* Left */}
      <div className="flex flex-1 items-center gap-3">
        {/* Mobile Menu */}
        <button
          onClick={onMenuClick}
          className="rounded-md p-2 transition hover:bg-accent md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Search */}
        <div className="flex flex-1 items-center gap-2 md:max-w-md">
          <Search className="h-4 w-4 text-muted-foreground" />

          <Input
            placeholder="Search..."
            className="border-0 shadow-none focus-visible:ring-0"
          />
        </div>
      </div>

      {/* Right */}
      <div className="ml-4 flex items-center gap-3 md:gap-5">
        <Bell className="h-5 w-5 cursor-pointer text-muted-foreground hover:text-foreground" />

        <UserCircle2 className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground" />
      </div>
    </header>
  );
}