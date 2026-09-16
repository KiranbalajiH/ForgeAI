import {
  MessageSquare,
  Database,
  Settings,
} from "lucide-react";

export const sidebarItems = [
  {
    title: "Chat / Ask",
    href: "/",
    icon: MessageSquare,
  },
  {
    title: "Knowledge Base",
    href: "/knowledge",
    icon: Database,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];