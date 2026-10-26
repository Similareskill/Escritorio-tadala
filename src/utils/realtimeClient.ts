import {
  ChatMessage,
  Direction,
  FurnitureItem,
  RoomZone,
  SprintTask,
  StickyNote,
  Teammate,
} from '../types/office';

export type RealtimeEventCallback = (type: string, payload: any) => void;

class RealtimeClient {
  private socket: WebSocket | null = null;
  private listeners: Set<RealtimeEventCallback> = new Set();
  private reconnectTimeout: any = null;
  public isConnected: boolean = false;
  private messageQueue: string[] = [];
  private currentUserId: string | null = null;
  private pendingIdentifyPayload: Teammate | null = null;
  public onlineCount: number = 1;

  constructor() {
    // Only connect in browser environment
    if (typeof window !== 'undefined') {
      this.connect();
    }
  }

  public subscribe(callback: RealtimeEventCallback) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private emitToListeners(type: string, payload: any) {
    for (const listener of this.listeners) {
      try {
        listener(type, payload);
      } catch (e) {
        console.error('Listener callback error:', e);
      }
    }
  }

  public connect() {
    if (typeof window === 'undefined') return;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.isConnected = true;
        this.emitToListeners('connection:status', { connected: true });

        // If user was previously identified, re-send identification
        if (this.pendingIdentifyPayload) {
          this.send('user:identify', this.pendingIdentifyPayload);
        }

        // Flush queued messages
        while (this.messageQueue.length > 0) {
          const msg = this.messageQueue.shift();
          if (msg && this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(msg);
          }
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          const { type, payload } = parsed;

          if (type === 'presence:count' && payload?.onlineCount) {
            this.onlineCount = payload.onlineCount;
          }

          this.emitToListeners(type, payload);
        } catch (err) {
          console.error('WebSocket parse error:', err);
        }
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        this.emitToListeners('connection:status', { connected: false });
        this.scheduleReconnect();
      };

      this.socket.onerror = () => {
        this.isConnected = false;
        if (this.socket) {
          this.socket.close();
        }
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) return;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, 2000);
  }

  private send(type: string, payload: any) {
    const raw = JSON.stringify({ type, payload });
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(raw);
    } else {
      this.messageQueue.push(raw);
      if (this.messageQueue.length > 80) {
        this.messageQueue.shift();
      }
    }
  }

  // --- Real-time Actions ---

  public identifyUser(user: Teammate) {
    this.currentUserId = user.id;
    this.pendingIdentifyPayload = user;
    this.send('user:identify', user);
  }

  public sendUserMove(
    id: string,
    x: number,
    y: number,
    direction: Direction,
    isWalking: boolean,
    currentRoomId: string | null
  ) {
    this.send('user:move', { id, x, y, direction, isWalking, currentRoomId });
  }

  public sendUserUpdate(id: string, updates: Partial<Teammate>) {
    this.send('user:update', { id, ...updates });
  }

  public sendUserReaction(id: string, emoji: string, label: string) {
    this.send('user:reaction', { id, emoji, label });
  }

  public sendChatMessage(message: ChatMessage) {
    this.send('chat:message', message);
  }

  public sendWhiteboardNoteAdd(note: StickyNote) {
    this.send('whiteboard:note:add', note);
  }

  public sendWhiteboardNoteDelete(id: string) {
    this.send('whiteboard:note:delete', { id });
  }

  public sendWhiteboardClear() {
    this.send('whiteboard:clear', {});
  }

  public sendSprintTaskMove(taskId: string, nextStatus: SprintTask['status']) {
    this.send('sprint:task:move', { taskId, nextStatus });
  }

  public sendSprintTaskAdd(task: SprintTask) {
    this.send('sprint:task:add', task);
  }

  public sendFurnitureAdd(item: FurnitureItem) {
    this.send('furniture:add', item);
  }

  public sendFurnitureUpdate(id: string, updates: Partial<FurnitureItem>) {
    this.send('furniture:update', { id, updates });
  }

  public sendFurnitureDelete(id: string) {
    this.send('furniture:delete', { id });
  }

  public sendFurnitureReset() {
    this.send('furniture:reset', {});
  }

  public sendRoomUpdate(id: string, updates: Partial<RoomZone>) {
    this.send('room:update', { id, updates });
  }

  public sendAdminAnnouncement(announcement: string | null) {
    this.send('admin:announcement', { announcement });
  }

  public sendAdminRemoveTeammate(id: string) {
    this.send('admin:remove_teammate', { id });
  }

  public sendAdminTeleportTeammate(id: string, x: number, y: number, roomId?: string | null) {
    this.send('admin:teleport_teammate', { id, x, y, roomId });
  }

  public sendAdminSummonAll(roomId: string) {
    this.send('admin:summon_all', { roomId });
  }

  public sendAdminResetDesks() {
    this.send('admin:reset_desks', {});
  }

  public sendAdminGlobalMute(mute: boolean) {
    this.send('admin:global_mute', { mute });
  }
}

export const realtimeClient = new RealtimeClient();
