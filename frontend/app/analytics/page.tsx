import PageTemplate from "@/components/common/page-template";

export default function AnalyticsPage() {
  return (
    <PageTemplate
      title="Analytics"
      description="Engineering metrics and repository analytics."
    >
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-xl font-semibold">Analytics</h2>
        <p className="mt-2 text-muted-foreground">
          Repository metrics, trends, and engineering analytics will be shown here.
        </p>
      </div>
    </PageTemplate>
  );
}