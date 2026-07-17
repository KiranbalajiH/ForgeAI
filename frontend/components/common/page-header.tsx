interface PageHeaderProps {
  title: string;
  description: string;
}

export default function PageHeader({
  title,
  description,
}: PageHeaderProps) {
  return (
    <div className="space-y-1">
      <h1 className="text-3xl font-bold tracking-tight">
        {title}
      </h1>

      <p className="text-muted-foreground">
        {description}
      </p>
    </div>
  );
}