import { useEffect, useRef } from 'react';
import { useChatStore } from '../store/chat';
import { Message } from '@webchat/shared';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function MessageList() {
  const { messages, user } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 ? (
        <div className="text-center text-gray-500 mt-8">
          No messages yet. Start the conversation!
        </div>
      ) : (
        messages.map((message: Message) => {
          const isOwnMessage = message.userId === user?.id;
          return (
            <div
              key={message.id}
              className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  isOwnMessage
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                {!isOwnMessage && (
                  <div className="text-xs font-semibold mb-1">
                    {message.username}
                  </div>
                )}
                {message.imageUrl && (
                  <div className="mb-2">
                    <img
                      src={`${API_URL}${message.imageUrl}`}
                      alt="Attachment"
                      className="rounded-lg max-w-full cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(`${API_URL}${message.imageUrl}`, '_blank')}
                      loading="lazy"
                    />
                  </div>
                )}
                {message.content && (
                  <div className="break-words">{message.content}</div>
                )}
                <div
                  className={`text-xs mt-1 ${
                    isOwnMessage ? 'text-blue-200' : 'text-gray-500'
                  }`}
                >
                  {formatTime(message.createdAt)}
                </div>
              </div>
            </div>
          );
        })
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
