import {
  LayoutDashboard,
  FolderGit2,
  BrainCircuit,
  GitBranch,
  ShieldCheck,
  FileText,
  BarChart3,
  Settings,
} from "lucide-react";

export const sidebarItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Repositories",
    href: "/repositories",
    icon: FolderGit2,
  },
  {
    title: "Engineering Brain",
    href: "/engineering",
    icon: BrainCircuit,
  },
  {
    title: "Architecture",
    href: "/architecture",
    icon: GitBranch,
  },
  {
    title: "Security",
    href: "/security",
    icon: ShieldCheck,
  },
  {
    title: "Documentation",
    href: "/documentation",
    icon: FileText,
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];