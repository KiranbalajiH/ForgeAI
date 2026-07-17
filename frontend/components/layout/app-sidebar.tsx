"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sidebarItems } from "@/components/navigation/sidebar-items";

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r bg-background min-h-screen">
      <div className="border-b p-6">
        <h1 className="text-2xl font-bold">ForgeAI</h1>
        <p className="text-sm text-muted-foreground">
          Engineering Intelligence
        </p>
      </div>

      <nav className="p-4 space-y-2">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.title}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}