import { ChatWindow } from '@/components/chat/ChatWindow';
import { UserMenu } from '@/components/chat/UserMenu';

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-gray-900 overflow-hidden relative">
      {/* Background gradient circles - now with pointer-events-none */}
      <div className="fixed top-[-250px] left-[-200px] w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] -z-10 pointer-events-none" />
      <div className="fixed bottom-[-250px] right-[-200px] w-[600px] h-[600px] rounded-full bg-secondary/5 blur-[120px] -z-10 pointer-events-none" />
      
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-semibold gradient-text">TimeBridgeAI</h1>
          <UserMenu />
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4">
        <ChatWindow />
      </main>
    </div>
  );
}