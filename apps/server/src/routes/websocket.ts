import { FastifyInstance } from 'fastify';
import { WebSocket } from 'ws';
import { prisma } from '../services/database.js';
import { redis, redisSub, CHANNELS } from '../services/redis.js';
import { WSMessageType, WSMessage } from '@webchat/shared';
import { nanoid } from 'nanoid';

// HTML sanitization helper to prevent XSS attacks
function sanitizeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
  };
  return text.replace(/[&<>"]/g, (char) => htmlEntities[char] || char);
}

interface AuthenticatedSocket extends WebSocket {
  userId?: string;
  username?: string;
  age?: number;
  sex?: string;
  rooms: Set<string>;
}

export async function websocketRoutes(fastify: FastifyInstance) {
  const clients = new Map<string, AuthenticatedSocket>();

  // Broadcast online users to all connected clients
  const broadcastOnlineUsers = () => {
    const onlineUsers = Array.from(clients.values()).map((client) => ({
      id: client.userId!,
      username: client.username!,
      age: client.age!,
      sex: client.sex!,
    }));

    const message = JSON.stringify({
      type: WSMessageType.ONLINE_USERS,
      payload: { users: onlineUsers },
    });

    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  // Subscribe to Redis channels
  redisSub.subscribe(
    CHANNELS.ROOM_MESSAGE,
    CHANNELS.USER_JOINED,
    CHANNELS.USER_LEFT,
    CHANNELS.DIRECT_MESSAGE
  );

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
      case CHANNELS.DIRECT_MESSAGE: {
        const { receiverId, wsMessage } = data;
        // Send DM to the receiver
        const receiverSocket = clients.get(receiverId);
        if (receiverSocket && receiverSocket.readyState === WebSocket.OPEN) {
          receiverSocket.send(JSON.stringify(wsMessage));
        }
        break;
      }
    }
  });

  fastify.get('/ws', { websocket: true }, (connection, req) => {
    const socket = connection.socket as unknown as AuthenticatedSocket;
    socket.rooms = new Set();

    // Authenticate WebSocket connection
    // Try to get token from Authorization header or query parameter
    let token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      // Fallback to query parameter
      const query = req.query as { token?: string };
      token = query.token;
    }

    if (!token) {
      socket.close(4001, 'Unauthorized');
      return;
    }

    try {
      const decoded = fastify.jwt.verify(token) as { userId: string; username: string };
      socket.userId = decoded.userId;
      socket.username = decoded.username;

      // Fetch user profile for online users display
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { age: true, sex: true },
      });

      if (user) {
        socket.age = user.age;
        socket.sex = user.sex;
      }

      clients.set(socket.userId, socket);

      // Broadcast updated online users list
      broadcastOnlineUsers();
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

            try {
              // Verify room exists
              const room = await prisma.room.findUnique({
                where: { id: roomId },
              });

              if (!room) {
                socket.send(
                  JSON.stringify({
                    type: WSMessageType.ERROR,
                    payload: { message: 'Room not found' },
                  })
                );
                return;
              }

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
            } catch (error) {
              console.error('Error joining room:', error);
              socket.send(
                JSON.stringify({
                  type: WSMessageType.ERROR,
                  payload: { message: 'Failed to join room' },
                })
              );
              return;
            }

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

            try {
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
            } catch (error) {
              console.error('Error publishing leave event:', error);
              // Don't send error to client as they've already left
            }
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

            try {
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
            } catch (error) {
              console.error('Error saving/publishing message:', error);
              socket.send(
                JSON.stringify({
                  type: WSMessageType.ERROR,
                  payload: { message: 'Failed to send message' },
                })
              );
            }
            break;
          }

          case WSMessageType.SEND_DM: {
            const { receiverId, content } = message.payload;

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

            if (trimmedContent.length > 1000) {
              socket.send(
                JSON.stringify({
                  type: WSMessageType.ERROR,
                  payload: { message: 'Message too long (max 1000 characters)' },
                })
              );
              return;
            }

            try {
              // Check if sender is blocked by receiver
              const isBlocked = await prisma.blockedUser.findFirst({
                where: {
                  blockerId: receiverId,
                  blockedId: socket.userId!,
                },
              });

              if (isBlocked) {
                socket.send(
                  JSON.stringify({
                    type: WSMessageType.ERROR,
                    payload: { message: 'Cannot send message to this user' },
                  })
                );
                return;
              }

              // Save DM to database
              const dm = await prisma.directMessage.create({
                data: {
                  id: nanoid(),
                  content: sanitizedContent,
                  senderId: socket.userId!,
                  receiverId,
                },
                include: {
                  sender: {
                    select: {
                      username: true,
                    },
                  },
                  receiver: {
                    select: {
                      username: true,
                    },
                  },
                },
              });

              const dmPayload = {
                id: dm.id,
                content: dm.content,
                senderId: dm.senderId,
                senderUsername: dm.sender.username,
                receiverId: dm.receiverId,
                receiverUsername: dm.receiver.username,
                createdAt: dm.createdAt,
                read: dm.read,
              };

              // Send to receiver via Redis
              await redis.publish(
                CHANNELS.DIRECT_MESSAGE,
                JSON.stringify({
                  receiverId,
                  wsMessage: {
                    type: WSMessageType.DM_RECEIVED,
                    payload: { message: dmPayload },
                  },
                })
              );

              // Send confirmation to sender
              socket.send(
                JSON.stringify({
                  type: WSMessageType.DM_RECEIVED,
                  payload: { message: dmPayload },
                })
              );
            } catch (error) {
              console.error('Error sending DM:', error);
              socket.send(
                JSON.stringify({
                  type: WSMessageType.ERROR,
                  payload: { message: 'Failed to send message' },
                })
              );
            }
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

        // Broadcast updated online users list
        broadcastOnlineUsers();
      }
    });
  });
}
