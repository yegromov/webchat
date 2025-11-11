// User types
export interface User {
  id: string;
  username: string;
  createdAt: Date;
}

export interface UserCredentials {
  username: string;
  password?: string;
}

// Message types
export interface Message {
  id: string;
  content: string;
  userId: string;
  username: string;
  roomId: string;
  createdAt: Date;
}

export interface CreateMessageDto {
  content: string;
  roomId: string;
}

// Room types
export interface Room {
  id: string;
  name: string;
  createdAt: Date;
}

// WebSocket message types
export enum WSMessageType {
  JOIN_ROOM = 'JOIN_ROOM',
  LEAVE_ROOM = 'LEAVE_ROOM',
  SEND_MESSAGE = 'SEND_MESSAGE',
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  USER_JOINED = 'USER_JOINED',
  USER_LEFT = 'USER_LEFT',
  ROOM_USERS = 'ROOM_USERS',
  ERROR = 'ERROR',
  // Future WebRTC support
  WEBRTC_OFFER = 'WEBRTC_OFFER',
  WEBRTC_ANSWER = 'WEBRTC_ANSWER',
  WEBRTC_ICE_CANDIDATE = 'WEBRTC_ICE_CANDIDATE',
}

export interface WSMessage<T = any> {
  type: WSMessageType;
  payload: T;
}

export interface JoinRoomPayload {
  roomId: string;
}

export interface LeaveRoomPayload {
  roomId: string;
}

export interface SendMessagePayload {
  content: string;
  roomId: string;
}

export interface MessageReceivedPayload {
  message: Message;
}

export interface UserJoinedPayload {
  userId: string;
  username: string;
  roomId: string;
}

export interface UserLeftPayload {
  userId: string;
  username: string;
  roomId: string;
}

export interface RoomUsersPayload {
  roomId: string;
  users: Array<{ id: string; username: string }>;
}

export interface ErrorPayload {
  message: string;
}

// Auth types
export interface AuthTokenPayload {
  userId: string;
  username: string;
}

export interface LoginRequest {
  username: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// WebRTC signaling types (for future use)
export interface WebRTCOffer {
  from: string;
  to: string;
  sdp: string;
}

export interface WebRTCAnswer {
  from: string;
  to: string;
  sdp: string;
}

export interface WebRTCIceCandidate {
  from: string;
  to: string;
  candidate: string;
}
