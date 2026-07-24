import {
  Activity,
  FolderGit2,
  ShieldCheck,
  BrainCircuit,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const stats = [
  {
    title: "Repository Health",
    value: "94%",
    icon: Activity,
  },
  {
    title: "Repositories",
    value: "12",
    icon: FolderGit2,
  },
  {
    title: "Security Score",
    value: "92%",
    icon: ShieldCheck,
  },
  {
    title: "AI Insights",
    value: "187",
    icon: BrainCircuit,
  },
];

export default function DashboardOverview() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <Card
            key={stat.title}
            className="transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4 md:px-6 md:pt-6">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>

              <Icon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>

            <CardContent className="px-4 pb-4 md:px-6 md:pb-6">
              <p className="text-2xl font-bold md:text-3xl">
                {stat.value}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}