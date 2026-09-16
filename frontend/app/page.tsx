import AppLayout from "@/components/layout/app-layout";
import PageHeader from "@/components/common/page-header";
import ChatPanel from "@/features/repository-chat/components/chat-panel";

export default function Home() {
  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-10rem)] flex-col gap-4">
        <PageHeader
          title="Chat / Ask"
          description="Ask questions grounded in your uploaded documents and live information."
        />

        <div className="flex min-h-0 flex-1">
          <ChatPanel />
        </div>
      </div>
    </AppLayout>
  );
}