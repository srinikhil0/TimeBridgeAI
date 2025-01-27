import { ChatWindow } from '@/components/chat/ChatWindow';
import { UserMenu } from '@/components/chat/UserMenu';

export default function ChatPage() {
  return (
    <div className="flex h-screen bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 p-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-semibold gradient-text">TimeBridgeAI</h1>
        </div>
        
        {/* New Chat Button */}
        <button className="w-full px-4 py-2 mb-4 text-sm text-white bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
          New Chat
        </button>

        {/* Chat History would go here */}
        <div className="space-y-2">
          {/* Chat history items */}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl flex items-center justify-between px-4">
          <div className="text-white">Chat Title</div>
          <UserMenu />
        </header>
        <main className="flex-1 relative">
          <ChatWindow />
        </main>
      </div>
    </div>
  );
}