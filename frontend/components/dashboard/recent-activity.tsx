import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const activities = [
  {
    title: "Repository analysis completed",
    time: "2 minutes ago",
  },
  {
    title: "Security scan finished",
    time: "12 minutes ago",
  },
  {
    title: "Architecture graph updated",
    time: "35 minutes ago",
  },
  {
    title: "Engineering Brain indexed repository",
    time: "1 hour ago",
  },
];

export default function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {activities.map((activity) => (
          <div
            key={activity.title}
            className="flex items-center justify-between border-b pb-3 last:border-0"
          >
            <div>
              <p className="font-medium">{activity.title}</p>
              <p className="text-sm text-muted-foreground">
                {activity.time}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}