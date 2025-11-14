import { useEffect } from 'react';
import { useChatStore } from '../store/chat';
import { api } from '../services/api';
import { wsService } from '../services/websocket';
import { WSMessageType } from '@webchat/shared';
import { RoomList } from './RoomList';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { Header } from './Header';
import { OnlineUsers } from './OnlineUsers';
import { DirectMessages } from './DirectMessages';

export function Chat() {
  const {
    token,
    currentRoom,
    currentDMUser,
    setRooms,
    setCurrentRoom,
    addMessage,
    setMessages,
    setOnlineUsers,
    addDirectMessage,
    setBlockedUsers,
  } = useChatStore();

  useEffect(() => {
    if (!token) return;

    // Connect WebSocket
    wsService.connect(token);

    // Set up WebSocket message handlers
    wsService.on(WSMessageType.MESSAGE_RECEIVED, ({ message }) => {
      addMessage(message);
    });

    wsService.on(WSMessageType.ONLINE_USERS, ({ users }) => {
      setOnlineUsers(users);
    });

    wsService.on(WSMessageType.DM_RECEIVED, ({ message }) => {
      addDirectMessage(message);
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

    // Fetch blocked users
    api.getBlockedUsers(token).then(({ blockedUsers }) => {
      setBlockedUsers(blockedUsers.map((u: any) => u.id));
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
        {currentDMUser ? (
          <DirectMessages />
        ) : (
          <div className="flex-1 flex flex-col">
            <MessageList />
            <MessageInput />
          </div>
        )}
        <OnlineUsers />
      </div>
    </div>
  );
}
