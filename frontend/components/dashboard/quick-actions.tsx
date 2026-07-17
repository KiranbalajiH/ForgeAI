import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>

      <CardContent className="grid gap-3">
        <Button className="w-full justify-start">
          Analyze Repository
        </Button>

        <Button variant="outline" className="w-full justify-start">
          Connect GitHub
        </Button>

        <Button variant="outline" className="w-full justify-start">
          Generate Architecture
        </Button>

        <Button variant="outline" className="w-full justify-start">
          Security Scan
        </Button>
      </CardContent>
    </Card>
  );
}