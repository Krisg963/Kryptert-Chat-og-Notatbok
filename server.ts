import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  ciphertext: string; // E2EE encrypted base64 payload
  iv: string;         // Initialization vector in base64
  timestamp: number;
}

interface UserPresence {
  userId: string;
  userName: string;
  userAvatar: string;
  userEmail: string;
  currentFolderId?: string;
  currentNoteId?: string;
  lastSeen: number;
}

interface ServerState {
  chatRooms: Record<string, ChatMessage[]>;
  users: Record<string, UserPresence>;
}

// In-memory persistent server state
const serverState: ServerState = {
  chatRooms: {},
  users: {},
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // Get initial server sync state
  app.get('/api/sync/messages/:roomId', (req, res) => {
    const roomId = req.params.roomId;
    res.json({
      roomId,
      messages: serverState.chatRooms[roomId] || [],
    });
  });

  // HTTP Server & WebSocket Server
  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Map of client sockets to their user metadata
  const socketClients = new Map<WebSocket, {
    userId?: string;
    userName?: string;
    userAvatar?: string;
    userEmail?: string;
    roomId?: string;
  }>();

  function broadcast(payload: any, filter?: (ws: WebSocket, clientMeta: any) => boolean) {
    const data = JSON.stringify(payload);
    for (const [client, meta] of socketClients.entries()) {
      if (client.readyState === WebSocket.OPEN) {
        if (!filter || filter(client, meta)) {
          client.send(data);
        }
      }
    }
  }

  function getOnlineUsers(roomId?: string) {
    const usersMap: Record<string, any> = {};
    for (const [, meta] of socketClients.entries()) {
      if (meta.userId) {
        if (!roomId || meta.roomId === roomId) {
          usersMap[meta.userId] = {
            userId: meta.userId,
            userName: meta.userName || 'Anonym',
            userAvatar: meta.userAvatar || '👤',
            userEmail: meta.userEmail || '',
            online: true,
          };
        }
      }
    }
    return Object.values(usersMap);
  }

  wss.on('connection', (ws) => {
    socketClients.set(ws, {});

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        const meta = socketClients.get(ws) || {};

        switch (msg.type) {
          case 'user:identify': {
            meta.userId = msg.userId;
            meta.userName = msg.userName;
            meta.userAvatar = msg.userAvatar;
            meta.userEmail = msg.userEmail;
            meta.roomId = msg.roomId || 'general';
            socketClients.set(ws, meta);

            // Send confirmation and current online users
            ws.send(JSON.stringify({
              type: 'sync:init',
              onlineUsers: getOnlineUsers(),
            }));

            // Notify everyone of user joined
            broadcast({
              type: 'presence:update',
              onlineUsers: getOnlineUsers(),
              joinedUser: {
                userId: meta.userId,
                userName: meta.userName,
              },
            });
            break;
          }

          case 'room:join': {
            meta.roomId = msg.roomId;
            socketClients.set(ws, meta);

            // Send existing messages for this room
            const roomMessages = serverState.chatRooms[msg.roomId] || [];
            ws.send(JSON.stringify({
              type: 'chat:history',
              roomId: msg.roomId,
              messages: roomMessages,
            }));

            // Broadcast room presence
            broadcast({
              type: 'room:presence',
              roomId: msg.roomId,
              onlineUsers: getOnlineUsers(msg.roomId),
            });
            break;
          }

          case 'chat:send': {
            const { message } = msg;
            if (!message || !message.roomId || !message.ciphertext) return;

            if (!serverState.chatRooms[message.roomId]) {
              serverState.chatRooms[message.roomId] = [];
            }
            // Idempotent check
            const exists = serverState.chatRooms[message.roomId].some(m => m.id === message.id);
            if (!exists) {
              serverState.chatRooms[message.roomId].push(message);
              // Cap at last 500 messages per room
              if (serverState.chatRooms[message.roomId].length > 500) {
                serverState.chatRooms[message.roomId].shift();
              }
            }

            // Broadcast E2EE ciphertext to all users in the room
            broadcast({
              type: 'chat:message',
              message,
            }, (client, cMeta) => !cMeta.roomId || cMeta.roomId === message.roomId);
            break;
          }

          case 'chat:clear': {
            const roomId = msg.roomId;
            if (roomId) {
              serverState.chatRooms[roomId] = [];
              broadcast({
                type: 'chat:cleared',
                roomId,
              }, (client, cMeta) => !cMeta.roomId || cMeta.roomId === roomId);
            }
            break;
          }

          case 'note:sync': {
            // Real-time note sync across tabs / devices
            broadcast({
              type: 'note:updated',
              note: msg.note,
              senderId: meta.userId,
            }, (client) => client !== ws);
            break;
          }

          case 'note:delete': {
            broadcast({
              type: 'note:deleted',
              noteId: msg.noteId,
              senderId: meta.userId,
            }, (client) => client !== ws);
            break;
          }

          case 'folder:sync': {
            broadcast({
              type: 'folder:updated',
              folder: msg.folder,
              senderId: meta.userId,
            }, (client) => client !== ws);
            break;
          }

          default:
            break;
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    });

    ws.on('close', () => {
      const meta = socketClients.get(ws);
      socketClients.delete(ws);
      if (meta?.userId) {
        broadcast({
          type: 'presence:update',
          onlineUsers: getOnlineUsers(),
          leftUserId: meta.userId,
        });
      }
    });
  });

  // Vite middleware for dev or static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server and WebSockets running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
