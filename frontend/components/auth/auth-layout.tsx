import { ReactNode } from "react";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export default function AuthLayout({
  title,
  subtitle,
  children,
}: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md rounded-xl border bg-background p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">ForgeAI</h1>

          <h2 className="mt-6 text-2xl font-semibold">
            {title}
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            {subtitle}
          </p>
        </div>

        {children}
      </div>
    </div>
  );
}