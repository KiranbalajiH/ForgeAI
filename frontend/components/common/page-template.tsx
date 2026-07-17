import AppLayout from "@/components/layout/app-layout";
import PageHeader from "./page-header";

interface PageTemplateProps {
  title: string;
  description: string;
  children?: React.ReactNode;
}

export default function PageTemplate({
  title,
  description,
  children,
}: PageTemplateProps) {
  return (
    <AppLayout>
      <div className="space-y-8">
        <PageHeader
          title={title}
          description={description}
        />

        {children ?? (
          <div className="rounded-xl border border-dashed p-12 text-center">
            <h2 className="text-xl font-semibold">
              {title}
            </h2>

            <p className="mt-2 text-muted-foreground">
              This module is under development.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}