import { create } from 'zustand';
import { User, Message, Room, OnlineUser, DirectMessage } from '@webchat/shared';

interface ChatState {
  user: User | null;
  token: string | null;
  rooms: Room[];
  currentRoom: Room | null;
  messages: Message[];
  onlineUsers: OnlineUser[];
  directMessages: DirectMessage[];
  currentDMUser: OnlineUser | null;
  blockedUsers: string[];

  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setRooms: (rooms: Room[]) => void;
  setCurrentRoom: (room: Room | null) => void;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setOnlineUsers: (users: OnlineUser[]) => void;
  addOnlineUser: (user: OnlineUser) => void;
  removeOnlineUser: (userId: string) => void;
  addDirectMessage: (message: DirectMessage) => void;
  setDirectMessages: (messages: DirectMessage[]) => void;
  setCurrentDMUser: (user: OnlineUser | null) => void;
  setBlockedUsers: (userIds: string[]) => void;
  addBlockedUser: (userId: string) => void;
  removeBlockedUser: (userId: string) => void;
  logout: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  user: null,
  token: null,
  rooms: [],
  currentRoom: null,
  messages: [],
  onlineUsers: [],
  directMessages: [],
  currentDMUser: null,
  blockedUsers: [],

  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  setRooms: (rooms) => set({ rooms }),
  setCurrentRoom: (room) => set({ currentRoom: room, currentDMUser: null, messages: [] }),
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
  addDirectMessage: (message) =>
    set((state) => ({
      directMessages: [...state.directMessages, message],
    })),
  setDirectMessages: (messages) => set({ directMessages: messages }),
  setCurrentDMUser: (user) => set({ currentDMUser: user, currentRoom: null }),
  setBlockedUsers: (userIds) => set({ blockedUsers: userIds }),
  addBlockedUser: (userId) =>
    set((state) => ({
      blockedUsers: [...state.blockedUsers, userId],
    })),
  removeBlockedUser: (userId) =>
    set((state) => ({
      blockedUsers: state.blockedUsers.filter((id) => id !== userId),
    })),
  logout: () =>
    set({
      user: null,
      token: null,
      rooms: [],
      currentRoom: null,
      messages: [],
      onlineUsers: [],
      directMessages: [],
      currentDMUser: null,
      blockedUsers: [],
    }),
}));
