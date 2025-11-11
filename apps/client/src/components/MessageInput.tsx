import { useState, FormEvent } from 'react';
import { wsService } from '../services/websocket';
import { useChatStore } from '../store/chat';

export function MessageInput() {
  const [message, setMessage] = useState('');
  const { currentRoom } = useChatStore();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !currentRoom) return;

    wsService.sendMessage(message.trim(), currentRoom.id);
    setMessage('');
  };

  if (!currentRoom) {
    return (
      <div className="p-4 bg-gray-100 text-center text-gray-500">
        Select a room to start chatting
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-gray-100 border-t">
      <div className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          maxLength={1000}
        />
        <button
          type="submit"
          disabled={!message.trim()}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </div>
    </form>
  );
}
