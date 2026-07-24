"use client";

import { ReactNode, useState } from "react";
import AppSidebar from "./app-sidebar";
import TopNavbar from "./top-navbar";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <AppSidebar />
      </div>

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ${
          isSidebarOpen
            ? "visible bg-black/50"
            : "invisible bg-transparent"
        }`}
        onClick={() => setIsSidebarOpen(false)}
      >
        <div
          className={`h-full w-64 bg-background shadow-xl transition-transform duration-300 ${
            isSidebarOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <AppSidebar />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNavbar onMenuClick={() => setIsSidebarOpen(true)} />

        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}