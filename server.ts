import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import {
  INITIAL_CHAT_MESSAGES,
  INITIAL_FURNITURE,
  INITIAL_ROOMS,
  INITIAL_SPRINT_TASKS,
  INITIAL_STICKY_NOTES,
  INITIAL_TEAMMATES,
} from './src/data/greenValleyData';
import {
  ChatMessage,
  FurnitureItem,
  RoomZone,
  SprintTask,
  StickyNote,
  Teammate,
} from './src/types/office';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

app.use(express.json());

// Authoritative Server-Side State
interface ServerState {
  rooms: RoomZone[];
  furniture: FurnitureItem[];
  teammates: Map<string, Teammate>;
  chatMessages: ChatMessage[];
  sprintTasks: SprintTask[];
  stickyNotes: StickyNote[];
  adminAnnouncement: string | null;
}

const state: ServerState = {
  rooms: JSON.parse(JSON.stringify(INITIAL_ROOMS)),
  furniture: JSON.parse(JSON.stringify(INITIAL_FURNITURE)),
  teammates: new Map(INITIAL_TEAMMATES.map((t) => [t.id, JSON.parse(JSON.stringify(t))])),
  chatMessages: JSON.parse(JSON.stringify(INITIAL_CHAT_MESSAGES)),
  sprintTasks: JSON.parse(JSON.stringify(INITIAL_SPRINT_TASKS)),
  stickyNotes: JSON.parse(JSON.stringify(INITIAL_STICKY_NOTES)),
  adminAnnouncement: 'Campus Green Valley sincronizado em tempo real.',
};

// Authoritative Real-Time WebSocket Server (noServer: true for clean co-existence with Vite HMR)
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  try {
    const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
    if (url.pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  } catch (err) {
    console.error('WebSocket upgrade routing error:', err);
  }
});

interface ClientSocket extends WebSocket {
  isAlive?: boolean;
  userId?: string;
}

function broadcast(type: string, payload: any, senderWs?: WebSocket) {
  const message = JSON.stringify({ type, payload, timestamp: Date.now() });
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN && client !== senderWs) {
      try {
        client.send(message);
      } catch (err) {
        console.error('Broadcast send error:', err);
      }
    }
  }
}

function broadcastAll(type: string, payload: any) {
  const message = JSON.stringify({ type, payload, timestamp: Date.now() });
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (err) {
        console.error('BroadcastAll send error:', err);
      }
    }
  }
}

// REST fallback endpoints
app.get('/api/state', (req, res) => {
  res.json({
    rooms: state.rooms,
    furniture: state.furniture,
    teammates: Array.from(state.teammates.values()),
    chatMessages: state.chatMessages,
    sprintTasks: state.sprintTasks,
    stickyNotes: state.stickyNotes,
    adminAnnouncement: state.adminAnnouncement,
    onlineDevices: wss.clients.size,
  });
});

wss.on('connection', (ws: ClientSocket, req) => {
  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // 1. Send full authoritative state on connection
  const initPayload = {
    rooms: state.rooms,
    furniture: state.furniture,
    teammates: Array.from(state.teammates.values()),
    chatMessages: state.chatMessages,
    sprintTasks: state.sprintTasks,
    stickyNotes: state.stickyNotes,
    adminAnnouncement: state.adminAnnouncement,
    onlineCount: wss.clients.size,
  };

  ws.send(JSON.stringify({ type: 'init:state', payload: initPayload }));

  // Notify everyone of new connection count
  broadcastAll('presence:count', { onlineCount: wss.clients.size });

  // 2. Handle incoming real-time messages
  ws.on('message', (data: string) => {
    try {
      const parsed = JSON.parse(data.toString());
      const { type, payload } = parsed;

      switch (type) {
        // User identification
        case 'user:identify': {
          if (payload && payload.id) {
            ws.userId = payload.id;
            state.teammates.set(payload.id, payload);
            broadcast('user:joined', payload, ws);
          }
          break;
        }

        // Live Avatar Movement & Position
        case 'user:move': {
          if (payload && payload.id) {
            const existing = state.teammates.get(payload.id);
            if (existing) {
              existing.x = payload.x;
              existing.y = payload.y;
              existing.direction = payload.direction || existing.direction;
              existing.isWalking = payload.isWalking ?? false;
              existing.currentRoomId = payload.currentRoomId ?? existing.currentRoomId;
              broadcast('user:moved', payload, ws);
            } else {
              state.teammates.set(payload.id, payload);
              broadcast('user:moved', payload, ws);
            }
          }
          break;
        }

        // User Profile, Status or Media Toggle
        case 'user:update': {
          if (payload && payload.id) {
            const existing = state.teammates.get(payload.id);
            const updated = existing ? { ...existing, ...payload } : payload;
            state.teammates.set(payload.id, updated);
            broadcastAll('user:updated', updated);
          }
          break;
        }

        // User Emoji Reaction or Speech Bubble
        case 'user:reaction': {
          if (payload && payload.id) {
            const existing = state.teammates.get(payload.id);
            if (existing) {
              existing.activeReaction = payload.emoji;
              existing.reactionTimestamp = Date.now();
            }
            broadcastAll('user:reaction', payload);
          }
          break;
        }

        // Chat Message
        case 'chat:message': {
          if (payload && payload.text) {
            state.chatMessages.push(payload);
            if (state.chatMessages.length > 200) {
              state.chatMessages.shift();
            }
            broadcastAll('chat:message', payload);
          }
          break;
        }

        // Whiteboard Synchronized Actions
        case 'whiteboard:note:add': {
          if (payload && payload.id) {
            state.stickyNotes.push(payload);
            broadcastAll('whiteboard:note:add', payload);
          }
          break;
        }

        case 'whiteboard:note:delete': {
          if (payload && payload.id) {
            state.stickyNotes = state.stickyNotes.filter((n) => n.id !== payload.id);
            broadcastAll('whiteboard:note:delete', payload);
          }
          break;
        }

        case 'whiteboard:draw': {
          broadcast('whiteboard:draw', payload, ws);
          break;
        }

        case 'whiteboard:clear': {
          broadcastAll('whiteboard:clear', {});
          break;
        }

        // Sprint Kanban Actions
        case 'sprint:task:move': {
          if (payload && payload.taskId) {
            const task = state.sprintTasks.find((t) => t.id === payload.taskId);
            if (task) {
              task.status = payload.nextStatus;
              broadcastAll('sprint:task:moved', payload);
            }
          }
          break;
        }

        case 'sprint:task:add': {
          if (payload && payload.id) {
            state.sprintTasks.push(payload);
            broadcastAll('sprint:task:added', payload);
          }
          break;
        }

        // Furniture Management
        case 'furniture:add': {
          if (payload && payload.id) {
            state.furniture.push(payload);
            broadcastAll('furniture:added', payload);
          }
          break;
        }

        case 'furniture:update': {
          if (payload && payload.id) {
            const idx = state.furniture.findIndex((f) => f.id === payload.id);
            if (idx !== -1) {
              state.furniture[idx] = { ...state.furniture[idx], ...payload.updates };
              broadcastAll('furniture:updated', payload);
            }
          }
          break;
        }

        case 'furniture:delete': {
          if (payload && payload.id) {
            state.furniture = state.furniture.filter((f) => f.id !== payload.id);
            broadcastAll('furniture:deleted', payload);
          }
          break;
        }

        case 'furniture:reset': {
          state.furniture = JSON.parse(JSON.stringify(INITIAL_FURNITURE));
          broadcastAll('furniture:reset', { furniture: state.furniture });
          break;
        }

        // Room Management & Locking
        case 'room:update': {
          if (payload && payload.id) {
            const idx = state.rooms.findIndex((r) => r.id === payload.id);
            if (idx !== -1) {
              state.rooms[idx] = { ...state.rooms[idx], ...payload.updates };
              broadcastAll('room:updated', payload);
            }
          }
          break;
        }

        // Admin Management Actions
        case 'admin:announcement': {
          state.adminAnnouncement = payload.announcement;
          broadcastAll('admin:announcement', payload);
          break;
        }

        case 'admin:remove_teammate': {
          if (payload && payload.id) {
            state.teammates.delete(payload.id);
            broadcastAll('admin:teammate_removed', payload);
          }
          break;
        }

        case 'admin:teleport_teammate': {
          if (payload && payload.id) {
            const existing = state.teammates.get(payload.id);
            if (existing) {
              existing.x = payload.x;
              existing.y = payload.y;
              existing.currentRoomId = payload.roomId ?? null;
              broadcastAll('admin:teammate_teleported', payload);
            }
          }
          break;
        }

        case 'admin:summon_all': {
          if (payload && payload.roomId) {
            const room = state.rooms.find((r) => r.id === payload.roomId);
            if (room) {
              const centerX = room.x + Math.round(room.width / 2);
              const centerY = room.y + Math.round(room.height / 2);
              let idx = 0;
              for (const [id, t] of state.teammates.entries()) {
                const offsetX = (idx % 4 - 1.5) * 44;
                const offsetY = Math.floor(idx / 4) * 44 - 30;
                t.x = Math.max(room.x + 30, Math.min(room.x + room.width - 30, centerX + offsetX));
                t.y = Math.max(room.y + 30, Math.min(room.y + room.height - 30, centerY + offsetY));
                t.currentRoomId = room.id;
                idx++;
              }
              broadcastAll('admin:all_summoned', {
                roomId: payload.roomId,
                teammates: Array.from(state.teammates.values()),
              });
            }
          }
          break;
        }

        case 'admin:reset_desks': {
          for (const [id, t] of state.teammates.entries()) {
            t.x = t.homeDeskX || 910;
            t.y = t.homeDeskY || 650;
            // recalculate room
            const room = state.rooms.find(
              (r) => t.x >= r.x && t.x <= r.x + r.width && t.y >= r.y && t.y <= r.y + r.height
            );
            t.currentRoomId = room ? room.id : null;
          }
          broadcastAll('admin:desks_reset', {
            teammates: Array.from(state.teammates.values()),
          });
          break;
        }

        case 'admin:global_mute': {
          for (const [id, t] of state.teammates.entries()) {
            t.isMuted = payload.mute;
          }
          broadcastAll('admin:global_mute', payload);
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
    broadcastAll('presence:count', { onlineCount: wss.clients.size });
  });
});

// Heartbeat ping interval
const heartbeat = setInterval(() => {
  for (const client of wss.clients) {
    const ws = client as ClientSocket;
    if (ws.isAlive === false) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, 30000);

wss.on('close', () => {
  clearInterval(heartbeat);
});

// Configure Vite middleware or production static files
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server },
        ws: isHmrDisabled ? false : { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  server.listen(port, '0.0.0.0', () => {
    console.log(`Green Valley Realtime Server running on http://0.0.0.0:${port}`);
  });
}

startServer();
