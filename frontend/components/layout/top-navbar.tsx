"use client";

import { Menu, LogOut, Database } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface TopNavbarProps {
  onMenuClick: () => void;
}

export default function TopNavbar({ onMenuClick }: TopNavbarProps) {
  const { isAuthenticated, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
      {/* Left: Mobile Menu & Product Identity */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-md p-2 transition hover:bg-accent md:hidden cursor-pointer"
          title="Toggle Mobile Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs">
            <Database className="h-4 w-4" />
          </div>
          <span className="font-semibold text-sm hidden sm:inline text-foreground">
            Agentic RAG Knowledge Assistant
          </span>
        </div>
      </div>

      {/* Right: Actions / Logout */}
      <div className="flex items-center gap-3">
        {isAuthenticated && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="gap-1.5 h-8 text-xs cursor-pointer text-muted-foreground hover:text-destructive hover:border-destructive/30"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Logout</span>
          </Button>
        )}
      </div>
    </header>
  );
}