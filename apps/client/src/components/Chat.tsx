import { useEffect } from 'react';
import { useChatStore } from '../store/chat';
import { api } from '../services/api';
import { wsService } from '../services/websocket';
import { WSMessageType } from '@webchat/shared';
import { RoomList } from './RoomList';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { Header } from './Header';

export function Chat() {
  const {
    token,
    currentRoom,
    setRooms,
    setCurrentRoom,
    addMessage,
    setMessages,
    setOnlineUsers,
    addOnlineUser,
    removeOnlineUser,
  } = useChatStore();

  useEffect(() => {
    if (!token) return;

    // Connect WebSocket
    wsService.connect(token);

    // Set up WebSocket message handlers
    wsService.on(WSMessageType.MESSAGE_RECEIVED, ({ message }) => {
      addMessage(message);
    });

    wsService.on(WSMessageType.USER_JOINED, ({ userId, username }) => {
      addOnlineUser({ id: userId, username });
    });

    wsService.on(WSMessageType.USER_LEFT, ({ userId }) => {
      removeOnlineUser(userId);
    });

    wsService.on(WSMessageType.ROOM_USERS, ({ users }) => {
      setOnlineUsers(users);
    });

    wsService.on(WSMessageType.ERROR, ({ message }) => {
      console.error('WebSocket error:', message);
    });

    // Fetch rooms
    api.getRooms(token).then(({ rooms }) => {
      setRooms(rooms);
      // Auto-select first room if available
      if (rooms.length > 0 && !currentRoom) {
        handleRoomSelect(rooms[0].id);
      }
    });

    return () => {
      if (currentRoom) {
        wsService.leaveRoom(currentRoom.id);
      }
      wsService.disconnect();
    };
  }, [token]);

  const handleRoomSelect = async (roomId: string) => {
    if (!token) return;

    // Leave current room
    if (currentRoom) {
      wsService.leaveRoom(currentRoom.id);
    }

    // Find and set new room
    const { rooms } = await api.getRooms(token);
    const room = rooms.find((r: any) => r.id === roomId);
    if (!room) return;

    setCurrentRoom(room);

    // Fetch room messages
    const { messages } = await api.getRoomMessages(token, roomId);
    setMessages(messages);

    // Join room via WebSocket
    wsService.joinRoom(roomId);
  };

  return (
    <div className="h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <RoomList onRoomSelect={handleRoomSelect} />
        <div className="flex-1 flex flex-col">
          <MessageList />
          <MessageInput />
        </div>
      </div>
    </div>
  );
}
