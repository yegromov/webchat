import { create } from 'zustand';
import { User, Message, Room } from '@webchat/shared';

interface ChatState {
  user: User | null;
  token: string | null;
  rooms: Room[];
  currentRoom: Room | null;
  messages: Message[];
  onlineUsers: Array<{ id: string; username: string }>;
  
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setRooms: (rooms: Room[]) => void;
  setCurrentRoom: (room: Room | null) => void;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setOnlineUsers: (users: Array<{ id: string; username: string }>) => void;
  addOnlineUser: (user: { id: string; username: string }) => void;
  removeOnlineUser: (userId: string) => void;
  logout: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  user: null,
  token: null,
  rooms: [],
  currentRoom: null,
  messages: [],
  onlineUsers: [],

  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  setRooms: (rooms) => set({ rooms }),
  setCurrentRoom: (room) => set({ currentRoom, messages: [] }),
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
  setMessages: (messages) => set({ messages }),
  setOnlineUsers: (users) => set({ onlineUsers: users }),
  addOnlineUser: (user) =>
    set((state) => ({
      onlineUsers: [...state.onlineUsers.filter(u => u.id !== user.id), user],
    })),
  removeOnlineUser: (userId) =>
    set((state) => ({
      onlineUsers: state.onlineUsers.filter((u) => u.id !== userId),
    })),
  logout: () =>
    set({
      user: null,
      token: null,
      rooms: [],
      currentRoom: null,
      messages: [],
      onlineUsers: [],
    }),
}));
