import { useState, useEffect, useRef, FormEvent } from 'react';
import { useChatStore } from '../store/chat';
import { wsService } from '../services/websocket';

export function DirectMessages() {
  const { user, currentDMUser, directMessages, setCurrentDMUser } = useChatStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [directMessages]);

  if (!currentDMUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <p className="text-lg font-medium">No conversation selected</p>
          <p className="text-sm mt-2">Click on an online user to start chatting</p>
        </div>
      </div>
    );
  }

  const conversationMessages = directMessages.filter(
    (msg) =>
      (msg.senderId === user?.id && msg.receiverId === currentDMUser.id) ||
      (msg.senderId === currentDMUser.id && msg.receiverId === user?.id)
  ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentDMUser) return;

    wsService.sendDM(currentDMUser.id, input.trim());
    setInput('');
  };

  const userColor = currentDMUser.sex === 'F' ? 'text-pink-600' : 'text-blue-600';

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
        <div>
          <h2 className={`font-semibold ${userColor}`}>
            {currentDMUser.username} ({currentDMUser.age})
          </h2>
          <p className="text-sm text-gray-500">Direct Message</p>
        </div>
        <button
          onClick={() => setCurrentDMUser(null)}
          className="text-gray-500 hover:text-gray-700 px-3 py-1 rounded hover:bg-gray-100"
        >
          Close
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {conversationMessages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No messages yet</p>
            <p className="text-sm mt-1">Start the conversation!</p>
          </div>
        ) : (
          conversationMessages.map((msg) => {
            const isOwnMessage = msg.senderId === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    isOwnMessage
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  <p className="break-words">{msg.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                    }`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message ${currentDMUser.username}...`}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            maxLength={1000}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
