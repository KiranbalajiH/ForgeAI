import PageTemplate from "@/components/common/page-template";

export default function SettingsPage() {
  return (
    <PageTemplate
      title="Settings"
      description="Manage your ForgeAI preferences."
    >
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-xl font-semibold">Settings</h2>
        <p className="mt-2 text-muted-foreground">
          Configure your account, notifications, integrations, and application preferences.
        </p>
      </div>
    </PageTemplate>
  );
}