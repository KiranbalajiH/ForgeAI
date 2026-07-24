"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sidebarItems } from "@/components/navigation/sidebar-items";

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="h-screen w-64 border-r bg-background shadow-lg md:shadow-none">
      {/* Logo */}
      <div className="border-b p-6">
        <h1 className="text-2xl font-bold">ForgeAI</h1>

        <p className="text-sm text-muted-foreground">
          Engineering Intelligence
        </p>
      </div>

      {/* Navigation */}
      <nav className="space-y-2 p-4">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.title}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />

              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}