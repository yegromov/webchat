import { useState } from 'react';
import { useChatStore } from '../store/chat';
import { api } from '../services/api';

interface RoomListProps {
  onRoomSelect: (roomId: string) => void;
}

export function RoomList({ onRoomSelect }: RoomListProps) {
  const { rooms, setRooms, currentRoom, token } = useChatStore();
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setLoading(true);
    try {
      const { room } = await api.createRoom(token, newRoomName);
      setRooms([...rooms, room]);
      setNewRoomName('');
      setShowCreateRoom(false);
      onRoomSelect(room.id);
    } catch (error: any) {
      alert(error.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-64 bg-gray-800 text-white p-4 flex flex-col">
      <h2 className="text-xl font-bold mb-4">Rooms</h2>

      <div className="flex-1 overflow-y-auto">
        {rooms.map((room) => (
          <button
            key={room.id}
            onClick={() => onRoomSelect(room.id)}
            className={`w-full text-left px-4 py-3 mb-2 rounded transition-colors ${
              currentRoom?.id === room.id
                ? 'bg-blue-600'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <div className="font-medium truncate">{room.name}</div>
          </button>
        ))}
      </div>

      <div className="mt-4">
        {!showCreateRoom ? (
          <button
            onClick={() => setShowCreateRoom(true)}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
          >
            + New Room
          </button>
        ) : (
          <form onSubmit={handleCreateRoom} className="space-y-2">
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Room name"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={1}
              maxLength={50}
              disabled={loading}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2 px-3 rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateRoom(false);
                  setNewRoomName('');
                }}
                className="flex-1 bg-gray-600 text-white py-2 px-3 rounded hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
