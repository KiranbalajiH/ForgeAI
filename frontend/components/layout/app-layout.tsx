import { ReactNode } from "react";
import AppSidebar from "./app-sidebar";
import TopNavbar from "./top-navbar";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />

      <div className="flex flex-1 flex-col">
        <TopNavbar />

        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}