import { FastifyInstance } from 'fastify';
import { WebSocket } from 'ws';
import { prisma } from '../services/database';
import { redis, redisSub, CHANNELS } from '../services/redis';
import { WSMessageType, WSMessage } from '@webchat/shared';
import { nanoid } from 'nanoid';

// HTML sanitization helper to prevent XSS attacks
function sanitizeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return text.replace(/[&<>"'/]/g, (char) => htmlEntities[char] || char);
}

interface AuthenticatedSocket extends WebSocket {
  userId?: string;
  username?: string;
  rooms: Set<string>;
}

export async function websocketRoutes(fastify: FastifyInstance) {
  const clients = new Map<string, AuthenticatedSocket>();

  // Subscribe to Redis channels
  redisSub.subscribe(CHANNELS.ROOM_MESSAGE, CHANNELS.USER_JOINED, CHANNELS.USER_LEFT);

  redisSub.on('message', (channel, message) => {
    const data = JSON.parse(message);

    switch (channel) {
      case CHANNELS.ROOM_MESSAGE: {
        const { roomId, wsMessage } = data;
        // Broadcast to all clients in the room
        clients.forEach((client) => {
          if (client.rooms.has(roomId) && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(wsMessage));
          }
        });
        break;
      }
      case CHANNELS.USER_JOINED:
      case CHANNELS.USER_LEFT: {
        const { roomId, wsMessage } = data;
        // Broadcast to all clients in the room
        clients.forEach((client) => {
          if (client.rooms.has(roomId) && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(wsMessage));
          }
        });
        break;
      }
    }
  });

  fastify.get('/ws', { websocket: true }, (connection, req) => {
    const socket = connection.socket as unknown as AuthenticatedSocket;
    socket.rooms = new Set();

    // Authenticate WebSocket connection
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      socket.close(4001, 'Unauthorized');
      return;
    }

    try {
      const decoded = fastify.jwt.verify(token) as { userId: string; username: string };
      socket.userId = decoded.userId;
      socket.username = decoded.username;
      clients.set(socket.userId, socket);
    } catch (error) {
      socket.close(4001, 'Invalid token');
      return;
    }

    socket.on('message', async (rawData: Buffer) => {
      try {
        const message: WSMessage = JSON.parse(rawData.toString());

        switch (message.type) {
          case WSMessageType.JOIN_ROOM: {
            const { roomId } = message.payload;
            socket.rooms.add(roomId);

            // Publish user joined event
            await redis.publish(
              CHANNELS.USER_JOINED,
              JSON.stringify({
                roomId,
                wsMessage: {
                  type: WSMessageType.USER_JOINED,
                  payload: {
                    userId: socket.userId,
                    username: socket.username,
                    roomId,
                  },
                },
              })
            );

            // Send current room users to the joining user
            const roomUsers: Array<{ id: string; username: string }> = [];
            clients.forEach((client) => {
              if (client.rooms.has(roomId) && client.userId !== socket.userId) {
                roomUsers.push({ id: client.userId!, username: client.username! });
              }
            });

            socket.send(
              JSON.stringify({
                type: WSMessageType.ROOM_USERS,
                payload: { roomId, users: roomUsers },
              })
            );
            break;
          }

          case WSMessageType.LEAVE_ROOM: {
            const { roomId } = message.payload;
            socket.rooms.delete(roomId);

            // Publish user left event
            await redis.publish(
              CHANNELS.USER_LEFT,
              JSON.stringify({
                roomId,
                wsMessage: {
                  type: WSMessageType.USER_LEFT,
                  payload: {
                    userId: socket.userId,
                    username: socket.username,
                    roomId,
                  },
                },
              })
            );
            break;
          }

          case WSMessageType.SEND_MESSAGE: {
            const { content, roomId } = message.payload;

            // Validate message content
            if (!content || typeof content !== 'string') {
              socket.send(
                JSON.stringify({
                  type: WSMessageType.ERROR,
                  payload: { message: 'Message content is required' },
                })
              );
              return;
            }

            const trimmedContent = content.trim();
            const sanitizedContent = sanitizeHtml(trimmedContent);

            if (trimmedContent.length === 0) {
              socket.send(
                JSON.stringify({
                  type: WSMessageType.ERROR,
                  payload: { message: 'Message cannot be empty' },
                })
              );
              return;
            }

            if (trimmedContent.length > 5000) {
              socket.send(
                JSON.stringify({
                  type: WSMessageType.ERROR,
                  payload: { message: 'Message too long (max 5000 characters)' },
                })
              );
              return;
            }

            if (!socket.rooms.has(roomId)) {
              socket.send(
                JSON.stringify({
                  type: WSMessageType.ERROR,
                  payload: { message: 'Not in room' },
                })
              );
              return;
            }

            // Save message to database
            const dbMessage = await prisma.message.create({
              data: {
                id: nanoid(),
                content: sanitizedContent,
                userId: socket.userId!,
                roomId,
              },
              include: {
                user: {
                  select: {
                    username: true,
                  },
                },
              },
            });

            // Publish message to Redis
            await redis.publish(
              CHANNELS.ROOM_MESSAGE,
              JSON.stringify({
                roomId,
                wsMessage: {
                  type: WSMessageType.MESSAGE_RECEIVED,
                  payload: {
                    message: {
                      id: dbMessage.id,
                      content: dbMessage.content,
                      userId: dbMessage.userId,
                      username: dbMessage.user.username,
                      roomId: dbMessage.roomId,
                      createdAt: dbMessage.createdAt,
                    },
                  },
                },
              })
            );
            break;
          }

          // Future WebRTC signaling handlers
          case WSMessageType.WEBRTC_OFFER:
          case WSMessageType.WEBRTC_ANSWER:
          case WSMessageType.WEBRTC_ICE_CANDIDATE: {
            // Placeholder for WebRTC signaling
            // Will be implemented when WebRTC support is added
            break;
          }

          default:
            socket.send(
              JSON.stringify({
                type: WSMessageType.ERROR,
                payload: { message: 'Unknown message type' },
              })
            );
        }
      } catch (error: any) {
        console.error('WebSocket message error:', error);
        socket.send(
          JSON.stringify({
            type: WSMessageType.ERROR,
            payload: { message: error.message || 'Internal server error' },
          })
        );
      }
    });

    socket.on('close', async () => {
      if (socket.userId) {
        // Notify all rooms that user left
        for (const roomId of socket.rooms) {
          await redis.publish(
            CHANNELS.USER_LEFT,
            JSON.stringify({
              roomId,
              wsMessage: {
                type: WSMessageType.USER_LEFT,
                payload: {
                  userId: socket.userId,
                  username: socket.username,
                  roomId,
                },
              },
            })
          );
        }
        clients.delete(socket.userId);
      }
    });
  });
}
