import { WSMessage, WSMessageType } from '@webchat/shared';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws';

export class WebSocketService {
  private ws: WebSocket | null = null;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private token: string | null = null;

  connect(token: string) {
    this.token = token;
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.ws = new WebSocket(`${WS_URL}?token=${token}`, undefined, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    } as any);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        const handler = this.messageHandlers.get(message.type);
        if (handler) {
          handler(message.payload);
        }
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.attemptReconnect();
    };
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.token) {
      this.reconnectAttempts++;
      console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
      setTimeout(() => {
        this.connect(this.token!);
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.token = null;
    this.messageHandlers.clear();
  }

  send(message: WSMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  on(type: WSMessageType, handler: (data: any) => void) {
    this.messageHandlers.set(type, handler);
  }

  off(type: WSMessageType) {
    this.messageHandlers.delete(type);
  }

  joinRoom(roomId: string) {
    this.send({
      type: WSMessageType.JOIN_ROOM,
      payload: { roomId },
    });
  }

  leaveRoom(roomId: string) {
    this.send({
      type: WSMessageType.LEAVE_ROOM,
      payload: { roomId },
    });
  }

  sendMessage(content: string, roomId: string) {
    this.send({
      type: WSMessageType.SEND_MESSAGE,
      payload: { content, roomId },
    });
  }
}

export const wsService = new WebSocketService();
