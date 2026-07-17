import AppLayout from "@/components/layout/app-layout";
import PageHeader from "@/components/common/page-header";
import DashboardOverview from "@/components/dashboard/dashboard-overview";
import QuickActions from "@/components/dashboard/quick-actions";
import RecentActivity from "@/components/dashboard/recent-activity";
import RepositoryHealthChart from "@/components/dashboard/repository-health-chart";

export default function Home() {
  return (
    <AppLayout>
      <div className="space-y-8">
        <PageHeader
          title="Dashboard"
          description="Welcome to ForgeAI Engineering Intelligence Platform."
        />

        <DashboardOverview />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RecentActivity />
          </div>

          <QuickActions />
        </div>

        <div className="rounded-xl border p-6">
          <h2 className="mb-6 text-xl font-semibold">
            Repository Health Trend
          </h2>

          <RepositoryHealthChart />
        </div>
      </div>
    </AppLayout>
  );
}