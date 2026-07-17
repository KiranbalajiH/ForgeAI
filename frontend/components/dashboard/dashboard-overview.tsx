import {
  Activity,
  FolderGit2,
  ShieldCheck,
  BrainCircuit,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>

              <Icon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>

            <CardContent>
              <p className="text-3xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}