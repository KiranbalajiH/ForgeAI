import AppLayout from "@/components/layout/app-layout";
import PageHeader from "@/components/common/page-header";
import ChatPanel from "@/features/repository-chat/components/chat-panel";

interface RepositoryChatPageProps {
  params: Promise<{ repoName: string }>;
}

export default async function RepositoryChatPage({
  params,
}: RepositoryChatPageProps) {
  const { repoName } = await params;

  // Decode URL-encoded repo names (e.g. "ForgeAI%20AG" → "ForgeAI AG")
  const decodedName = decodeURIComponent(repoName);

  return (
    <AppLayout>
      {/* Page fills the available height so the chat panel can stretch */}
      <div className="flex h-[calc(100vh-4rem)] flex-col gap-6">
        <PageHeader
          title="Repository Chat"
          description={`Ask questions about the ${decodedName} codebase.`}
        />

        {/* Chat panel takes all remaining height */}
        <div className="flex min-h-0 flex-1">
          <ChatPanel repositoryName={decodedName} />
        </div>
      </div>
    </AppLayout>
  );
}
