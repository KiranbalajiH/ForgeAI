import PageTemplate from "@/components/common/page-template";

export default function SecurityPage() {
  return (
    <PageTemplate
      title="Security"
      description="Security insights and vulnerability reports."
    >
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-xl font-semibold">Security</h2>
        <p className="mt-2 text-muted-foreground">
          Security scans, dependency checks, and vulnerability reports will appear here.
        </p>
      </div>
    </PageTemplate>
  );
}