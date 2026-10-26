import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  Volume2,
  VolumeX,
  Search,
  Navigation,
  Hand,
  Send,
  Lock,
  Unlock,
  SlidersHorizontal,
  PenTool,
  LayoutGrid,
  Radio,
  Coffee,
  PanelLeftClose,
  PanelLeftOpen,
  Trash2,
} from 'lucide-react';
import {
  AvatarConfig,
  ChatMessage,
  Direction,
  FurnitureCategory,
  FurnitureItem,
  RoomZone,
  SprintTask,
  StickyNote,
  Teammate,
  UserPresenceStatus,
} from './types/office';
import {
  INITIAL_CHAT_MESSAGES,
  INITIAL_FURNITURE,
  INITIAL_ROOMS,
  INITIAL_SPRINT_TASKS,
  INITIAL_STICKY_NOTES,
  INITIAL_TEAMMATES,
  WORKSPACE_METADATA,
} from './data/greenValleyData';
import { soundEngine } from './utils/soundEngine';
import { OfficeCanvas } from './components/OfficeCanvas';
import { ProximityVideoHUD } from './components/ProximityVideoHUD';
import { WhiteboardModal } from './components/WhiteboardModal';
import { SprintBoardModal } from './components/SprintBoardModal';
import { AvatarCustomizerModal, InviteModal } from './components/AvatarCustomizerModal';
import { AdminPanel } from './components/AdminPanel';
import { AdminLoginModal, ADMIN_AUTH_KEY } from './components/AdminLoginModal';
import { ShieldAlert, Megaphone, Wifi, WifiOff } from 'lucide-react';
import { realtimeClient } from './utils/realtimeClient';

type TopNavSection = 'map' | 'rooms' | 'directory' | 'builder' | 'admin';
type SidebarTab = 'teammates' | 'rooms' | 'chat';

const REACTION_EMOJIS = [
  { emoji: '👋', label: 'Wave' },
  { emoji: '🎉', label: 'Celebrate' },
  { emoji: '☕', label: 'Coffee Break' },
  { emoji: '🔥', label: 'Ship It' },
  { emoji: '❤️', label: 'Appreciate' },
  { emoji: '✋', label: 'Raise Hand' },
];

export default function App() {
  // Parse URL query parameter ?user=UtSkfwosV4TH8twDN3k1DShVAbz1 if present
  const userTokenFromUrl = useMemo(() => {
    if (typeof window === 'undefined') return WORKSPACE_METADATA.defaultUserToken;
    const params = new URLSearchParams(window.location.search);
    return params.get('user') || WORKSPACE_METADATA.defaultUserToken;
  }, []);

  // Multi-device and multi-tab unique session identity
  const [sessionUserId] = useState<string>(() => {
    if (typeof window === 'undefined') return 'tm-1';
    let stored = sessionStorage.getItem('gv_office_uid');
    if (stored) return stored;

    const params = new URLSearchParams(window.location.search);
    const userParam = params.get('user');

    if (userParam && userParam !== WORKSPACE_METADATA.defaultUserToken) {
      stored = `tm-${userParam}`;
    } else {
      const isLeadActive = localStorage.getItem('gv_office_lead_active');
      if (!isLeadActive) {
        stored = 'tm-1'; // Primary Host: Elena Woods
        localStorage.setItem('gv_office_lead_active', 'true');
        window.addEventListener('beforeunload', () => {
          localStorage.removeItem('gv_office_lead_active');
        });
      } else {
        const rand = Math.random().toString(36).substring(2, 6);
        stored = `tm-device-${rand}`;
      }
    }
    sessionStorage.setItem('gv_office_uid', stored);
    return stored;
  });

  const [activeNav, setActiveNav] = useState<TopNavSection>('map');
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('teammates');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('All');

  // Real-time synchronization state
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [onlineDevices, setOnlineDevices] = useState(1);

  // Core Spatial State
  const [rooms, setRooms] = useState<RoomZone[]>(INITIAL_ROOMS);
  const [furniture, setFurniture] = useState<FurnitureItem[]>(INITIAL_FURNITURE);
  const [teammates, setTeammates] = useState<Teammate[]>(() => {
    const existing = INITIAL_TEAMMATES.find((t) => t.id === sessionUserId);
    if (existing) {
      return INITIAL_TEAMMATES.map((t) => ({
        ...t,
        isCurrentUser: t.id === sessionUserId,
        statusMessage: `Session ${t.id} · Green Valley`,
      }));
    }
    // Automatically create a stylish avatar for second connected device / tab
    const randSuffix = sessionUserId.replace('tm-device-', '').replace('tm-', '').slice(0, 4);
    const deviceUser: Teammate = {
      id: sessionUserId,
      name: `Colleague (${randSuffix || 'Device 2'})`,
      role: 'Spatial Designer',
      department: 'Design',
      status: 'Available',
      statusMessage: 'Online via Realtime Sync',
      x: 1040 + Math.floor(Math.random() * 80 - 40),
      y: 920 + Math.floor(Math.random() * 80 - 40),
      direction: 'down',
      isWalking: false,
      isSpeaking: false,
      isMuted: false,
      isVideoOn: true,
      isCurrentUser: true,
      avatar: {
        skinColor: '#f1c27d',
        hairColor: '#3b2314',
        shirtColor: '#0ea5e9',
        hairStyle: 'curly',
        accessory: 'headset',
      },
      currentRoomId: 'courtyard-plaza',
      homeDeskX: 1040,
      homeDeskY: 920,
    };
    return [...INITIAL_TEAMMATES.map((t) => ({ ...t, isCurrentUser: false })), deviceUser];
  });

  // Media & Audio Controls
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [soundEffectsOn, setSoundEffectsOn] = useState(true);
  const [cafeLoFiPlaying, setCafeLoFiPlaying] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);

  // Office Builder State
  const [selectedBuilderType, setSelectedBuilderType] = useState<FurnitureCategory>('desk-pod');

  // Collaboration Modals & Interactive Room Tools
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [isSprintBoardOpen, setIsSprintBoardOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>(INITIAL_STICKY_NOTES);
  const [sprintTasks, setSprintTasks] = useState<SprintTask[]>(INITIAL_SPRINT_TASKS);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES);
  const [chatInput, setChatInput] = useState('');
  const [chatChannel, setChatChannel] = useState<'proximity' | 'office-wide'>('proximity');
  const [toastNotification, setToastNotification] = useState<string | null>(null);
  const [adminAnnouncement, setAdminAnnouncement] = useState<string | null>(
    'Bem-vindo ao Green Valley Office. Painel de administração ativo.'
  );
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      return (
        localStorage.getItem(ADMIN_AUTH_KEY) === 'true' ||
        sessionStorage.getItem(ADMIN_AUTH_KEY) === 'true'
      );
    } catch {
      return false;
    }
  });
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);

  const pressedKeysRef = useRef<Set<string>>(new Set());
  const prevRoomIdRef = useRef<string | null>('courtyard-plaza');
  const footstepTimerRef = useRef<number>(0);

  const showToast = useCallback((message: string) => {
    setToastNotification(message);
  }, []);

  const handleAdminLoginSuccess = useCallback(() => {
    setIsAdminAuthenticated(true);
    setIsAdminLoginOpen(false);
    setActiveNav('admin');
    showToast('Sessão de administrador autenticada com sucesso!');
  }, [showToast]);

  const handleAdminLogout = useCallback(() => {
    setIsAdminAuthenticated(false);
    try {
      localStorage.removeItem(ADMIN_AUTH_KEY);
      sessionStorage.removeItem(ADMIN_AUTH_KEY);
    } catch (e) {
      console.error(e);
    }
    setActiveNav('map');
    showToast('Sessão administrativa encerrada.');
  }, [showToast]);

  useEffect(() => {
    if (!toastNotification) return;
    const timer = setTimeout(() => setToastNotification(null), 3200);
    return () => clearTimeout(timer);
  }, [toastNotification]);

  const currentUser = useMemo(
    () => teammates.find((t) => t.isCurrentUser) || teammates[0],
    [teammates]
  );

  const lastSentMoveRef = useRef<{ x: number; y: number; time: number; walking: boolean }>({
    x: 0,
    y: 0,
    time: 0,
    walking: false,
  });

  // Real-time synchronization lifecycle
  useEffect(() => {
    realtimeClient.connect();
    realtimeClient.identifyUser(currentUser);
  }, []);

  useEffect(() => {
    const unsubscribe = realtimeClient.subscribe((type, payload) => {
      switch (type) {
        case 'connection:status':
          setIsLiveConnected(payload.connected);
          if (payload.connected) {
            realtimeClient.identifyUser(currentUser);
          }
          break;

        case 'presence:count':
          if (payload?.onlineCount) {
            setOnlineDevices(payload.onlineCount);
          }
          break;

        case 'init:state': {
          if (payload) {
            if (payload.rooms) setRooms(payload.rooms);
            if (payload.furniture) setFurniture(payload.furniture);
            if (payload.chatMessages) setChatMessages(payload.chatMessages);
            if (payload.sprintTasks) setSprintTasks(payload.sprintTasks);
            if (payload.stickyNotes) setStickyNotes(payload.stickyNotes);
            if (payload.adminAnnouncement !== undefined) setAdminAnnouncement(payload.adminAnnouncement);
            if (payload.onlineCount) setOnlineDevices(payload.onlineCount);

            if (Array.isArray(payload.teammates)) {
              setTeammates((prev) => {
                const current = prev.find((t) => t.isCurrentUser);
                const map = new Map<string, Teammate>();
                for (const t of payload.teammates) {
                  if (current && t.id === current.id) {
                    map.set(current.id, { ...t, ...current, isCurrentUser: true });
                  } else {
                    map.set(t.id, { ...t, isCurrentUser: false });
                  }
                }
                if (current && !map.has(current.id)) {
                  map.set(current.id, current);
                }
                return Array.from(map.values());
              });
            }
          }
          break;
        }

        case 'user:joined': {
          if (payload && payload.id) {
            setTeammates((prev) => {
              const current = prev.find((t) => t.isCurrentUser);
              if (current && payload.id === current.id) return prev;
              const idx = prev.findIndex((t) => t.id === payload.id);
              if (idx !== -1) {
                return prev.map((t) =>
                  t.id === payload.id ? { ...t, ...payload, isCurrentUser: false } : t
                );
              }
              return [...prev, { ...payload, isCurrentUser: false }];
            });
            showToast(`${payload.name || 'Um colega'} conectou ao Green Valley Office 🚀`);
          }
          break;
        }

        case 'user:moved': {
          if (payload && payload.id) {
            setTeammates((prev) =>
              prev.map((t) => {
                if (t.id === payload.id && !t.isCurrentUser) {
                  return {
                    ...t,
                    x: payload.x,
                    y: payload.y,
                    direction: payload.direction || t.direction,
                    isWalking: payload.isWalking,
                    currentRoomId:
                      payload.currentRoomId !== undefined
                        ? payload.currentRoomId
                        : t.currentRoomId,
                  };
                }
                return t;
              })
            );
          }
          break;
        }

        case 'user:updated': {
          if (payload && payload.id) {
            setTeammates((prev) =>
              prev.map((t) =>
                t.id === payload.id
                  ? {
                      ...t,
                      ...payload,
                      isCurrentUser: t.isCurrentUser,
                    }
                  : t
              )
            );
          }
          break;
        }

        case 'user:reaction': {
          if (payload && payload.id) {
            const now = Date.now();
            setTeammates((prev) =>
              prev.map((t) =>
                t.id === payload.id
                  ? { ...t, activeReaction: payload.emoji, reactionTimestamp: now }
                  : t
              )
            );
          }
          break;
        }

        case 'chat:message': {
          if (payload && payload.id) {
            setChatMessages((prev) => {
              if (prev.some((m) => m.id === payload.id)) return prev;
              return [...prev, payload];
            });
            const now = Date.now();
            setTeammates((prev) =>
              prev.map((t) =>
                t.id === payload.senderId
                  ? { ...t, speechBubble: payload.text, speechTimestamp: now }
                  : t
              )
            );
            if (payload.senderId !== sessionUserId) {
              soundEngine.playProximityConnect();
            }
          }
          break;
        }

        case 'whiteboard:note:add': {
          if (payload && payload.id) {
            setStickyNotes((prev) => {
              if (prev.some((n) => n.id === payload.id)) return prev;
              return [...prev, payload];
            });
          }
          break;
        }

        case 'whiteboard:note:delete': {
          if (payload && payload.id) {
            setStickyNotes((prev) => prev.filter((n) => n.id !== payload.id));
          }
          break;
        }

        case 'whiteboard:clear': {
          setStickyNotes([]);
          break;
        }

        case 'sprint:task:moved': {
          if (payload && payload.taskId) {
            setSprintTasks((prev) =>
              prev.map((t) => (t.id === payload.taskId ? { ...t, status: payload.nextStatus } : t))
            );
          }
          break;
        }

        case 'sprint:task:added': {
          if (payload && payload.id) {
            setSprintTasks((prev) => {
              if (prev.some((t) => t.id === payload.id)) return prev;
              return [...prev, payload];
            });
          }
          break;
        }

        case 'furniture:added': {
          if (payload && payload.id) {
            setFurniture((prev) => {
              if (prev.some((f) => f.id === payload.id)) return prev;
              return [...prev, payload];
            });
          }
          break;
        }

        case 'furniture:updated': {
          if (payload && payload.id) {
            setFurniture((prev) =>
              prev.map((f) => (f.id === payload.id ? { ...f, ...payload.updates } : f))
            );
          }
          break;
        }

        case 'furniture:deleted': {
          if (payload && payload.id) {
            setFurniture((prev) => prev.filter((f) => f.id !== payload.id));
          }
          break;
        }

        case 'furniture:reset': {
          if (payload && payload.furniture) {
            setFurniture(payload.furniture);
          }
          break;
        }

        case 'room:updated': {
          if (payload && payload.id) {
            setRooms((prev) =>
              prev.map((r) => (r.id === payload.id ? { ...r, ...payload.updates } : r))
            );
          }
          break;
        }

        case 'admin:announcement': {
          if (payload) {
            setAdminAnnouncement(payload.announcement);
            if (payload.announcement) {
              showToast(`Aviso da Administração: ${payload.announcement}`);
            }
          }
          break;
        }

        case 'admin:teammate_removed': {
          if (payload && payload.id) {
            if (payload.id === sessionUserId) {
              showToast('Você foi removido do mapa pelo Administrador.');
            } else {
              setTeammates((prev) => prev.filter((t) => t.id !== payload.id));
            }
          }
          break;
        }

        case 'admin:teammate_teleported': {
          if (payload && payload.id) {
            setTeammates((prev) =>
              prev.map((t) => {
                if (t.id === payload.id) {
                  return {
                    ...t,
                    x: payload.x,
                    y: payload.y,
                    targetX: undefined,
                    targetY: undefined,
                    currentRoomId: payload.roomId !== undefined ? payload.roomId : t.currentRoomId,
                  };
                }
                return t;
              })
            );
            if (payload.id === sessionUserId) {
              showToast('Você foi teletransportado pelo Administrador.');
              soundEngine.playRoomEnter();
            }
          }
          break;
        }

        case 'admin:all_summoned': {
          if (payload && payload.teammates) {
            setTeammates((prev) => {
              return payload.teammates.map((st: Teammate) => ({
                ...st,
                isCurrentUser: st.id === sessionUserId,
              }));
            });
            showToast('Todos os membros foram convocados pelo Administrador!');
            soundEngine.playWaveOrKnock();
          }
          break;
        }

        case 'admin:desks_reset': {
          if (payload && payload.teammates) {
            setTeammates((prev) => {
              return payload.teammates.map((st: Teammate) => ({
                ...st,
                isCurrentUser: st.id === sessionUserId,
              }));
            });
            showToast('Posições retornadas às mesas de trabalho');
          }
          break;
        }

        case 'admin:global_mute': {
          if (payload) {
            setTeammates((prev) => prev.map((t) => ({ ...t, isMuted: payload.mute })));
            if (payload.mute) {
              setIsMicOn(false);
              showToast('Microfones mutados globalmente pelo Administrador');
            } else {
              showToast('Mudo global desativado pelo Administrador');
            }
          }
          break;
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [sessionUserId, showToast]);

  // Determine which room a coordinate (x, y) falls inside
  const findRoomAtPosition = useCallback(
    (x: number, y: number): RoomZone | null => {
      for (const r of rooms) {
        if (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height) {
          return r;
        }
      }
      return null;
    },
    [rooms]
  );

  const activeRoom = useMemo(
    () => findRoomAtPosition(currentUser.x, currentUser.y),
    [findRoomAtPosition, currentUser.x, currentUser.y]
  );

  // Compute which teammates are connected via same room OR proximity radius (<= 210px)
  const connectedTeammates = useMemo(() => {
    return teammates.filter((t) => {
      if (t.isCurrentUser) return false;
      if (isBroadcasting) return true;
      if (activeRoom && t.currentRoomId === activeRoom.id) {
        return true;
      }
      // If activeRoom is a sound-isolated Focus Pod, only connect with people inside that same pod
      if (activeRoom?.isQuietZone) {
        return false;
      }
      const dist = Math.hypot(t.x - currentUser.x, t.y - currentUser.y);
      return dist <= WORKSPACE_METADATA.proximityRadius;
    });
  }, [teammates, currentUser.x, currentUser.y, activeRoom, isBroadcasting]);

  const connectedTeammateIds = useMemo(
    () => new Set(connectedTeammates.map((t) => t.id)),
    [connectedTeammates]
  );

  // Track room transitions & trigger spatial sound effects
  useEffect(() => {
    const newRoomId = activeRoom?.id || null;
    if (newRoomId !== prevRoomIdRef.current) {
      prevRoomIdRef.current = newRoomId;
      if (newRoomId) {
        soundEngine.playRoomEnter();
      }
    }
  }, [activeRoom]);

  // Keyboard Listeners (WASD / Arrow keys + M/V shortcuts)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (['w', 'a', 's', 'd', 'W', 'A', 'S', 'D', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift'].includes(e.key)) {
        pressedKeysRef.current.add(e.key);
      } else if (e.key === 'm' || e.key === 'M') {
        setIsMicOn((prev) => !prev);
      } else if (e.key === 'v' || e.key === 'V') {
        setIsCamOn((prev) => !prev);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      pressedKeysRef.current.delete(e.key);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // 60Hz Avatar Movement & Waypoint Loop
  useEffect(() => {
    const interval = setInterval(() => {
      const keys = pressedKeysRef.current;
      const up = keys.has('w') || keys.has('W') || keys.has('ArrowUp');
      const down = keys.has('s') || keys.has('S') || keys.has('ArrowDown');
      const left = keys.has('a') || keys.has('A') || keys.has('ArrowLeft');
      const right = keys.has('d') || keys.has('D') || keys.has('ArrowRight');
      const isSprinting = keys.has('Shift');

      setTeammates((prev) =>
        prev.map((person) => {
          // 1. Handle Current User Movement
          if (person.isCurrentUser) {
            let dx = 0;
            let dy = 0;
            const speed = isSprinting ? 7.2 : 4.6;

            if (up) dy -= speed;
            if (down) dy -= speed;
            if (left) dx -= speed;
            if (right) dx += speed;

            // If user pressed manual movement keys, override click-to-walk target
            if (dx !== 0 || dy !== 0) {
              if (dx !== 0 && dy !== 0) {
                dx *= 0.7071;
                dy *= 0.7071;
              }
              const nextX = Math.max(45, Math.min(WORKSPACE_METADATA.mapWidth - 45, person.x + dx));
              const nextY = Math.max(45, Math.min(WORKSPACE_METADATA.mapHeight - 45, person.y + dy));
              const direction: Direction =
                Math.abs(dx) > Math.abs(dy)
                  ? dx > 0
                    ? 'right'
                    : 'left'
                  : dy > 0
                  ? 'down'
                  : 'up';

              const now = Date.now();
              if (now - footstepTimerRef.current > 240) {
                footstepTimerRef.current = now;
                soundEngine.playFootstep();
              }

              const room = findRoomAtPosition(nextX, nextY);

              // Throttle real-time WebSocket broadcast (every ~45ms or on movement change)
              const last = lastSentMoveRef.current;
              if (now - last.time > 45 || !last.walking) {
                lastSentMoveRef.current = { x: nextX, y: nextY, time: now, walking: true };
                realtimeClient.sendUserMove(person.id, nextX, nextY, direction, true, room ? room.id : null);
              }

              return {
                ...person,
                x: nextX,
                y: nextY,
                targetX: undefined,
                targetY: undefined,
                direction,
                isWalking: true,
                isSpeaking: isMicOn,
                currentRoomId: room ? room.id : null,
              };
            }

            // Otherwise check if click-to-walk target is active
            if (person.targetX !== undefined && person.targetY !== undefined) {
              const distX = person.targetX - person.x;
              const distY = person.targetY - person.y;
              const dist = Math.hypot(distX, distY);

              if (dist <= speed) {
                const room = findRoomAtPosition(person.targetX, person.targetY);
                lastSentMoveRef.current = { x: person.targetX, y: person.targetY, time: Date.now(), walking: false };
                realtimeClient.sendUserMove(person.id, person.targetX, person.targetY, person.direction, false, room ? room.id : null);
                return {
                  ...person,
                  x: person.targetX,
                  y: person.targetY,
                  targetX: undefined,
                  targetY: undefined,
                  isWalking: false,
                  currentRoomId: room ? room.id : null,
                };
              }

              const stepX = (distX / dist) * speed;
              const stepY = (distY / dist) * speed;
              const nextX = person.x + stepX;
              const nextY = person.y + stepY;
              const direction: Direction =
                Math.abs(stepX) > Math.abs(stepY)
                  ? stepX > 0
                    ? 'right'
                    : 'left'
                  : stepY > 0
                  ? 'down'
                  : 'up';

              const now = Date.now();
              if (now - footstepTimerRef.current > 250) {
                footstepTimerRef.current = now;
                soundEngine.playFootstep();
              }

              const room = findRoomAtPosition(nextX, nextY);

              // Throttle real-time WebSocket broadcast
              const last = lastSentMoveRef.current;
              if (now - last.time > 45 || !last.walking) {
                lastSentMoveRef.current = { x: nextX, y: nextY, time: now, walking: true };
                realtimeClient.sendUserMove(person.id, nextX, nextY, direction, true, room ? room.id : null);
              }

              return {
                ...person,
                x: nextX,
                y: nextY,
                direction,
                isWalking: true,
                currentRoomId: room ? room.id : null,
              };
            }

            if (person.isWalking) {
              lastSentMoveRef.current = { x: person.x, y: person.y, time: Date.now(), walking: false };
              realtimeClient.sendUserMove(person.id, person.x, person.y, person.direction, false, person.currentRoomId);
              return { ...person, isWalking: false };
            }
            return person;
          }

          // 2. Handle Simulated Teammates Walking to Waypoints
          if (person.targetX !== undefined && person.targetY !== undefined) {
            const distX = person.targetX - person.x;
            const distY = person.targetY - person.y;
            const dist = Math.hypot(distX, distY);
            const npcSpeed = 3.2;

            if (dist <= npcSpeed) {
              const room = findRoomAtPosition(person.targetX, person.targetY);
              return {
                ...person,
                x: person.targetX,
                y: person.targetY,
                targetX: undefined,
                targetY: undefined,
                isWalking: false,
                currentRoomId: room ? room.id : null,
              };
            }

            const stepX = (distX / dist) * npcSpeed;
            const stepY = (distY / dist) * npcSpeed;
            const nextX = person.x + stepX;
            const nextY = person.y + stepY;
            const room = findRoomAtPosition(nextX, nextY);
            return {
              ...person,
              x: nextX,
              y: nextY,
              isWalking: true,
              direction:
                Math.abs(stepX) > Math.abs(stepY)
                  ? stepX > 0
                    ? 'right'
                    : 'left'
                  : stepY > 0
                  ? 'down'
                  : 'up',
              currentRoomId: room ? room.id : null,
            };
          }

          return person;
        })
      );
    }, 16);

    return () => clearInterval(interval);
  }, [findRoomAtPosition, isMicOn]);

  // Autonomous Teammate Micro-Simulation (speaking cadence & clearing expired reactions)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setTeammates((prev) =>
        prev.map((t) => {
          let updated = { ...t };
          if (t.reactionTimestamp && now - t.reactionTimestamp > 3500) {
            updated.activeReaction = null;
            updated.reactionTimestamp = undefined;
          }
          if (t.speechTimestamp && now - t.speechTimestamp > 7000) {
            updated.speechBubble = null;
            updated.speechTimestamp = undefined;
          }
          if (!t.isCurrentUser && !t.isMuted && Math.random() < 0.25) {
            updated.isSpeaking = !t.isSpeaking;
          }
          return updated;
        })
      );
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  // Handlers
  const handleSetWalkTarget = useCallback(
    (targetX: number, targetY: number) => {
      const destRoom = findRoomAtPosition(targetX, targetY);
      if (destRoom?.isLocked && destRoom.id !== activeRoom?.id) {
        soundEngine.playWaveOrKnock();
        showToast(`${destRoom.name} is currently locked. Knock sent to occupants.`);
        return;
      }

      setTeammates((prev) =>
        prev.map((t) => (t.isCurrentUser ? { ...t, targetX, targetY } : t))
      );
      if (activeNav !== 'map' && activeNav !== 'builder') {
        setActiveNav('map');
      }
    },
    [findRoomAtPosition, activeRoom, showToast, activeNav]
  );

  const handleWalkToTeammate = (person: Teammate) => {
    handleSetWalkTarget(person.x - 46, person.y + 16);
    soundEngine.playProximityConnect();
    showToast(`Walking over to ${person.name}`);
  };

  const handleWalkToRoom = (room: RoomZone) => {
    handleSetWalkTarget(room.x + room.width / 2, room.y + room.height / 2 + 20);
    showToast(`Walking to ${room.name}`);
  };

  const handleWaveAtTeammate = useCallback(
    (teammateId: string) => {
      soundEngine.playWaveOrKnock();
      const now = Date.now();
      const target = teammates.find((t) => t.id === teammateId);
      if (!target) return;

      showToast(`You waved at ${target.name} 👋`);

      setTeammates((prev) =>
        prev.map((t) => {
          if (t.isCurrentUser) {
            return { ...t, activeReaction: '👋', reactionTimestamp: now };
          }
          if (t.id === teammateId) {
            return {
              ...t,
              activeReaction: '👋',
              reactionTimestamp: now,
              speechBubble: `Hey ${currentUser.name.split(' ')[0]}! Good to see you in Green Valley!`,
              speechTimestamp: now,
            };
          }
          return t;
        })
      );
    },
    [teammates, currentUser.name, showToast]
  );

  const handleTriggerReaction = (emoji: string, label: string) => {
    soundEngine.playProximityConnect();
    const now = Date.now();
    setTeammates((prev) =>
      prev.map((t) =>
        t.isCurrentUser ? { ...t, activeReaction: emoji, reactionTimestamp: now } : t
      )
    );
    realtimeClient.sendUserReaction(currentUser.id, emoji, label);
    showToast(`Reaction sent: ${emoji} ${label}`);
  };

  const handleToggleRoomLock = (roomId: string) => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id === roomId) {
          const nextLocked = !r.isLocked;
          showToast(`${r.name} is now ${nextLocked ? 'locked' : 'unlocked'}`);
          realtimeClient.sendRoomUpdate(roomId, { isLocked: nextLocked });
          return { ...r, isLocked: nextLocked };
        }
        return r;
      })
    );
  };

  const handleInteractWithObject = useCallback(
    (
      actionType: 'whiteboard' | 'sprint-board' | 'jukebox' | 'broadcast' | 'coffee' | 'claim-desk',
      item?: FurnitureItem
    ) => {
      soundEngine.playProximityConnect();
      if (actionType === 'whiteboard') {
        setIsWhiteboardOpen(true);
      } else if (actionType === 'sprint-board') {
        setIsSprintBoardOpen(true);
      } else if (actionType === 'jukebox') {
        const playing = soundEngine.toggleCafeLoFi();
        setCafeLoFiPlaying(playing);
        showToast(
          playing
            ? 'Valley Café Lo-Fi Ambient Synth enabled ☕'
            : 'Valley Café Lo-Fi Ambient Synth paused'
        );
      } else if (actionType === 'broadcast') {
        setIsBroadcasting((prev) => {
          const next = !prev;
          showToast(
            next
              ? 'Town Hall Megaphone Broadcast active across Green Valley Office'
              : 'Town Hall Megaphone Broadcast ended'
          );
          return next;
        });
      } else if (actionType === 'coffee') {
        handleTriggerReaction('☕', 'Fresh Espresso');
      } else if (actionType === 'claim-desk' && item) {
        setFurniture((prev) =>
          prev.map((f) =>
            f.id === item.id ? { ...f, claimedBy: currentUser.name } : f
          )
        );
        realtimeClient.sendFurnitureUpdate(item.id, { claimedBy: currentUser.name });
        showToast(`Claimed ${item.label} for ${currentUser.name}`);
      }
    },
    [currentUser.name, showToast]
  );

  const handlePlaceFurniture = (x: number, y: number, type: FurnitureCategory) => {
    const targetRoom = findRoomAtPosition(x, y);
    const labelMap: Record<FurnitureCategory, string> = {
      'desk-pod': 'Custom Dual-Monitor Desk',
      'conference-table': 'Conference Table',
      couch: 'Botanical Lounge Sofa',
      'cafe-bar': 'Espresso Counter',
      'plant-monstera': 'Potted Monstera Plant',
      'plant-pine': 'Green Valley Pine',
      'whiteboard-easel': 'Collaborative Whiteboard',
      'sprint-kiosk': 'Sprint Kanban Wall',
      fountain: 'Courtyard Fountain',
      podium: 'Broadcast Podium',
      bookshelf: 'Team Bookshelf',
      'arcade-cabinet': 'Retro Arcade Cabinet',
      'garden-bench': 'Outdoor Garden Bench',
      'focus-desk': 'Quiet Focus Desk',
    };

    const newItem: FurnitureItem = {
      id: `furn-${Date.now()}`,
      type,
      label: labelMap[type],
      x,
      y,
      width: type === 'couch' ? 130 : type === 'desk-pod' ? 110 : 54,
      height: type === 'couch' ? 60 : type === 'desk-pod' ? 68 : 54,
      roomId: targetRoom?.id,
      interactiveType:
        type === 'whiteboard-easel'
          ? 'whiteboard'
          : type === 'desk-pod'
          ? 'claim-desk'
          : type === 'arcade-cabinet'
          ? 'coffee'
          : undefined,
    };

    setFurniture((prev) => [...prev, newItem]);
    realtimeClient.sendFurnitureAdd(newItem);
    soundEngine.playProximityConnect();
    showToast(`Placed ${newItem.label} at (${x}, ${y})`);
  };

  const handleDeleteFurniture = (id: string) => {
    setFurniture((prev) => prev.filter((f) => f.id !== id));
    realtimeClient.sendFurnitureDelete(id);
    showToast('Removed furniture item from floorplan');
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const text = chatInput.trim();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      text,
      timestamp: nowTime,
      channel: chatChannel,
      roomId: activeRoom?.id || null,
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    realtimeClient.sendChatMessage(userMsg);

    // Show speech bubble above user's avatar on the canvas
    const now = Date.now();
    setTeammates((prev) =>
      prev.map((t) =>
        t.isCurrentUser ? { ...t, speechBubble: text, speechTimestamp: now } : t
      )
    );

    // If solitary local session, provide companion reply
    if (onlineDevices <= 1) {
      const responder =
        connectedTeammates[0] || teammates.find((t) => !t.isCurrentUser);
      if (responder) {
        setTimeout(() => {
          const replyText = activeRoom
            ? `Got it! Love how fast proximity sync feels inside ${activeRoom.name}.`
            : `Loud and clear from ${responder.currentRoomId ? 'across the campus' : 'the courtyard'}!`;

          setChatMessages((prev) => [
            ...prev,
            {
              id: `msg-reply-${Date.now()}`,
              senderId: responder.id,
              senderName: responder.name,
              senderRole: responder.role,
              text: replyText,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              channel: chatChannel,
              roomId: activeRoom?.id || null,
            },
          ]);

          setTeammates((prev) =>
            prev.map((t) =>
              t.id === responder.id
                ? { ...t, speechBubble: replyText, speechTimestamp: Date.now(), activeReaction: '👍', reactionTimestamp: Date.now() }
                : t
            )
          );
        }, 900);
      }
    }
  };

  const handleUpdateProfile = (
    name: string,
    role: string,
    status: UserPresenceStatus,
    statusMessage: string,
    avatar: AvatarConfig
  ) => {
    setTeammates((prev) =>
      prev.map((t) =>
        t.isCurrentUser ? { ...t, name, role, status, statusMessage, avatar } : t
      )
    );
    realtimeClient.sendUserUpdate(currentUser.id, { name, role, status, statusMessage, avatar });
    showToast('Updated your Green Valley Office profile');
  };

  const handleSpawnGuestTeammate = (
    name: string,
    role: string,
    destinationRoomId: string
  ) => {
    const destRoom = rooms.find((r) => r.id === destinationRoomId) || rooms[0];
    const spawnX = destRoom.x + Math.round(destRoom.width / 2) + (Math.random() * 80 - 40);
    const spawnY = destRoom.y + Math.round(destRoom.height / 2) + (Math.random() * 60 - 30);

    const newTeammate: Teammate = {
      id: `tm-guest-${Date.now()}`,
      name,
      role,
      department: 'Partner',
      status: 'Available',
      statusMessage: `Just joined ${destRoom.name}`,
      x: spawnX,
      y: spawnY,
      direction: 'down',
      isWalking: false,
      isSpeaking: true,
      isMuted: false,
      isVideoOn: true,
      currentRoomId: destRoom.id,
      homeDeskX: spawnX,
      homeDeskY: spawnY,
      speechBubble: `Hi team! Just joined ${destRoom.name}.`,
      speechTimestamp: Date.now(),
      avatar: {
        skinColor: '#f1c27d',
        hairColor: '#1e293b',
        shirtColor: '#38bdf8',
        hairStyle: 'short',
        accessory: 'headset',
      },
    };

    setTeammates((prev) => [...prev, newTeammate]);
    realtimeClient.sendUserUpdate(newTeammate.id, newTeammate);
    soundEngine.playRoomEnter();
    showToast(`${name} joined ${destRoom.name}`);
  };

  // Admin Management Handlers
  const handleUpdateTeammate = useCallback((teammateId: string, updates: Partial<Teammate>) => {
    setTeammates((prev) =>
      prev.map((t) => (t.id === teammateId ? { ...t, ...updates } : t))
    );
    realtimeClient.sendUserUpdate(teammateId, updates);
  }, []);

  const handleRemoveTeammate = useCallback((teammateId: string) => {
    setTeammates((prev) => prev.filter((t) => t.id !== teammateId));
    realtimeClient.sendAdminRemoveTeammate(teammateId);
  }, []);

  const handleAddTeammate = useCallback((teammate: Teammate) => {
    setTeammates((prev) => [...prev, teammate]);
    realtimeClient.sendUserUpdate(teammate.id, teammate);
  }, []);

  const handleTeleportTeammate = useCallback(
    (teammateId: string, targetX: number, targetY: number, targetRoomId?: string | null) => {
      setTeammates((prev) =>
        prev.map((t) => {
          if (t.id === teammateId) {
            return {
              ...t,
              x: targetX,
              y: targetY,
              targetX: undefined,
              targetY: undefined,
              currentRoomId: targetRoomId !== undefined ? targetRoomId : t.currentRoomId,
            };
          }
          return t;
        })
      );
      realtimeClient.sendAdminTeleportTeammate(teammateId, targetX, targetY, targetRoomId);
    },
    []
  );

  const handleUpdateRoom = useCallback((roomId: string, updates: Partial<RoomZone>) => {
    setRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, ...updates } : r))
    );
    realtimeClient.sendRoomUpdate(roomId, updates);
  }, []);

  const handleSummonEveryoneToRoom = useCallback(
    (roomId: string) => {
      const room = rooms.find((r) => r.id === roomId);
      if (!room) return;
      const centerX = room.x + Math.round(room.width / 2);
      const centerY = room.y + Math.round(room.height / 2);

      setTeammates((prev) =>
        prev.map((t, idx) => {
          const offsetX = (idx % 4 - 1.5) * 44;
          const offsetY = Math.floor(idx / 4) * 44 - 30;
          return {
            ...t,
            x: Math.max(room.x + 30, Math.min(room.x + room.width - 30, centerX + offsetX)),
            y: Math.max(room.y + 30, Math.min(room.y + room.height - 30, centerY + offsetY)),
            targetX: undefined,
            targetY: undefined,
            currentRoomId: room.id,
          };
        })
      );
      realtimeClient.sendAdminSummonAll(roomId);
    },
    [rooms]
  );

  const handleResetEveryoneToDesks = useCallback(() => {
    setTeammates((prev) =>
      prev.map((t) => {
        const deskX = t.homeDeskX || 910;
        const deskY = t.homeDeskY || 650;
        const homeRoom = findRoomAtPosition(deskX, deskY);
        return {
          ...t,
          x: deskX,
          y: deskY,
          targetX: undefined,
          targetY: undefined,
          currentRoomId: homeRoom?.id || null,
        };
      })
    );
    realtimeClient.sendAdminResetDesks();
  }, [findRoomAtPosition]);

  const handleGlobalMuteToggle = useCallback((mute: boolean) => {
    setTeammates((prev) =>
      prev.map((t) => ({ ...t, isMuted: mute }))
    );
    if (mute) {
      setIsMicOn(false);
    }
    realtimeClient.sendAdminGlobalMute(mute);
  }, []);

  const handleUpdateFurniture = useCallback((furnitureId: string, updates: Partial<FurnitureItem>) => {
    setFurniture((prev) =>
      prev.map((f) => (f.id === furnitureId ? { ...f, ...updates } : f))
    );
    realtimeClient.sendFurnitureUpdate(furnitureId, updates);
  }, []);

  const handleResetFurnitureLayout = useCallback(() => {
    setFurniture(INITIAL_FURNITURE);
    realtimeClient.sendFurnitureReset();
  }, []);

  const handleUpdateAnnouncement = useCallback((msg: string | null) => {
    setAdminAnnouncement(msg);
    realtimeClient.sendAdminAnnouncement(msg);
  }, []);

  // Filtered lists
  const filteredTeammates = useMemo(() => {
    return teammates.filter((t) => {
      const matchesDept =
        departmentFilter === 'All' || t.department === departmentFilter;
      const matchesQuery =
        !searchQuery.trim() ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.statusMessage.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDept && matchesQuery;
    });
  }, [teammates, departmentFilter, searchQuery]);

  const departments = useMemo(() => {
    const set = new Set(teammates.map((t) => t.department));
    return ['All', ...Array.from(set)];
  }, [teammates]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* MANDATORY 3-ZONE TOP BAR CONTRACT */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-950 border-b border-slate-800/90 shrink-0 z-30">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#map"
          onClick={(e) => {
            e.preventDefault();
            setActiveNav('map');
          }}
          className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 font-display"
        >
          Green Valley Office
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <button
            onClick={() => setActiveNav('map')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
              activeNav === 'map'
                ? 'text-white border-b-2 border-emerald-400'
                : ''
            }`}
          >
            Office Map
          </button>
          <button
            onClick={() => setActiveNav('rooms')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
              activeNav === 'rooms'
                ? 'text-white border-b-2 border-emerald-400'
                : ''
            }`}
          >
            Meeting Rooms
          </button>
          <button
            onClick={() => setActiveNav('directory')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
              activeNav === 'directory'
                ? 'text-white border-b-2 border-emerald-400'
                : ''
            }`}
          >
            Team Directory
          </button>
          <button
            onClick={() => setActiveNav(activeNav === 'builder' ? 'map' : 'builder')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
              activeNav === 'builder'
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : ''
            }`}
          >
            Office Builder
          </button>
          <button
            onClick={() => {
              if (isAdminAuthenticated) {
                setActiveNav(activeNav === 'admin' ? 'map' : 'admin');
              } else {
                setIsAdminLoginOpen(true);
              }
            }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 flex items-center gap-1.5 ${
              activeNav === 'admin'
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : ''
            }`}
            title={
              isAdminAuthenticated
                ? 'Painel de Gestão Admin (Autenticado)'
                : 'Painel de Gestão Admin (Requer Login)'
            }
          >
            <ShieldAlert className={`w-3.5 h-3.5 ${isAdminAuthenticated ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>Admin Console</span>
            {isAdminAuthenticated ? (
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded font-mono">
                Logado
              </span>
            ) : (
              <Lock className="w-3 h-3 text-slate-500" />
            )}
          </button>
        </nav>

        {/* Zone 3: Live real-time indicator + 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs shadow-inner"
            title={isLiveConnected ? 'Sincronização em tempo real ativa em todos os dispositivos' : 'Reconectando ao servidor WebSocket...'}
          >
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isLiveConnected ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isLiveConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <span className="text-[11px] font-medium text-slate-300 whitespace-nowrap">
              {isLiveConnected ? (
                <>
                  <span className="text-emerald-400 font-semibold">{onlineDevices}</span> {onlineDevices === 1 ? 'dispositivo conectado' : 'dispositivos conectados'}
                </>
              ) : (
                <span className="text-amber-400">Reconectando...</span>
              )}
            </span>
          </div>

          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 rounded-lg hover:bg-emerald-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Invite Teammate
          </button>
        </div>
      </header>

      {/* GLOBAL ADMIN ANNOUNCEMENT BANNER */}
      {adminAnnouncement && (
        <div className="bg-amber-950/80 border-b border-amber-500/40 text-amber-200 text-xs px-6 py-2 flex items-center justify-between gap-4 shrink-0 z-30">
          <div className="flex items-center gap-2 truncate">
            <Megaphone className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold text-white shrink-0">Aviso da Administração:</span>
            <span className="truncate">{adminAnnouncement}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveNav('admin')}
              className="text-emerald-400 hover:text-emerald-300 text-xs underline cursor-pointer"
            >
              Gerenciar Campus
            </button>
            <button
              onClick={() => setAdminAnnouncement(null)}
              className="text-slate-400 hover:text-white text-xs cursor-pointer"
              title="Dispensar aviso"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* MAIN WORKSPACE BODY */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* LEFT COLLAPSIBLE SIDEBAR (280px) */}
        {isSidebarOpen ? (
          <aside className="w-72 bg-slate-900/95 border-r border-slate-800/90 flex flex-col shrink-0 z-20">
            {/* Sidebar Segmented Filter Tabs */}
            <div className="p-3 border-b border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg flex-1">
                  <button
                    onClick={() => setSidebarTab('teammates')}
                    className={`flex-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      sidebarTab === 'teammates'
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    People ({teammates.length})
                  </button>
                  <button
                    onClick={() => setSidebarTab('rooms')}
                    className={`flex-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      sidebarTab === 'rooms'
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Rooms ({rooms.length})
                  </button>
                  <button
                    onClick={() => setSidebarTab('chat')}
                    className={`flex-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      sidebarTab === 'chat'
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Chat
                  </button>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Collapse Sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>

              {sidebarTab !== 'chat' && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Find teammate or room..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}
            </div>

            {/* TAB 1: TEAMMATES LIST */}
            {sidebarTab === 'teammates' && (
              <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
                {filteredTeammates.map((person) => {
                  const roomObj = rooms.find((r) => r.id === person.currentRoomId);
                  const isConnected = connectedTeammateIds.has(person.id);

                  return (
                    <div
                      key={person.id}
                      className="p-3.5 hover:bg-slate-800/40 transition-colors flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-white/15"
                            style={{ backgroundColor: person.avatar.shirtColor }}
                          >
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: person.avatar.skinColor }}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate">
                              {person.name}
                            </div>
                            {/* Zero-Pill Unboxed Metadata with · separators */}
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate">
                              <span className="truncate">{person.role}</span>
                              <span aria-hidden="true">·</span>
                              <span className="text-emerald-400 whitespace-nowrap">
                                {person.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                        <span className="truncate">
                          {roomObj ? roomObj.name : 'Outdoor Valley Path'}
                          {isConnected ? ' · In Earshot' : ''}
                        </span>

                        {!person.isCurrentUser ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleWaveAtTeammate(person.id)}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                              title={`Wave at ${person.name}`}
                            >
                              <Hand className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleWalkToTeammate(person)}
                              className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap"
                            >
                              <Navigation className="w-2.5 h-2.5" />
                              <span>Walk To</span>
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Remover "${person.name}" do Office Map?`)) {
                                  handleRemoveTeammate(person.id);
                                  showToast(`Membro "${person.name}" removido`);
                                }
                              }}
                              className="p-1 rounded bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                              title={`Remover ${person.name} do mapa`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setIsAvatarModalOpen(true)}
                            className="text-[11px] text-emerald-400 hover:underline cursor-pointer whitespace-nowrap"
                          >
                            Edit Profile
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 2: ROOMS & ZONES LIST */}
            {sidebarTab === 'rooms' && (
              <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
                {rooms
                  .filter(
                    (r) =>
                      !searchQuery.trim() ||
                      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      r.category.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((room) => {
                    const roomPeople = teammates.filter((t) => t.currentRoomId === room.id);
                    const isHere = activeRoom?.id === room.id;

                    return (
                      <div
                        key={room.id}
                        className={`p-3.5 transition-colors space-y-2 ${
                          isHere ? 'bg-emerald-950/25' : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-white truncate">
                            {room.name}
                          </span>
                          <span className="text-xs font-mono text-slate-400 tabular-nums shrink-0">
                            {roomPeople.length}/{room.capacity}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <span>{room.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>{room.isLocked ? 'Locked' : 'Open Access'}</span>
                          {isHere && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-emerald-400 font-medium">You are here</span>
                            </>
                          )}
                        </div>

                        {roomPeople.length > 0 && (
                          <div className="text-[11px] text-slate-300 truncate">
                            Active: {roomPeople.map((p) => p.name.split(' ')[0]).join(', ')}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1">
                          <button
                            onClick={() => handleToggleRoomLock(room.id)}
                            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
                          >
                            {room.isLocked ? (
                              <>
                                <Lock className="w-3 h-3 text-amber-400" />
                                <span>Unlock</span>
                              </>
                            ) : (
                              <>
                                <Unlock className="w-3 h-3" />
                                <span>Lock</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleWalkToRoom(room)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-emerald-600 text-xs font-medium text-slate-200 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <Navigation className="w-3 h-3" />
                            <span>{isHere ? 'Center Here' : 'Walk Here'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* TAB 3: CAMPUS & PROXIMITY CHAT */}
            {sidebarTab === 'chat' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-3 py-2 bg-slate-950/50 border-b border-slate-800 flex items-center gap-1">
                  <button
                    onClick={() => setChatChannel('proximity')}
                    className={`flex-1 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                      chatChannel === 'proximity'
                        ? 'bg-emerald-600/20 text-emerald-300'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Proximity / Room
                  </button>
                  <button
                    onClick={() => setChatChannel('office-wide')}
                    className={`flex-1 py-1 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                      chatChannel === 'office-wide'
                        ? 'bg-emerald-600/20 text-emerald-300'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Office-Wide
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-200">{msg.senderName}</span>
                        <span className="font-mono text-slate-500 tabular-nums">{msg.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-300 bg-slate-950/90 border border-slate-800/90 rounded-lg p-2.5 leading-relaxed">
                        {msg.text}
                      </p>
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={handleSendChatMessage}
                  className="p-3 border-t border-slate-800 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={`Message ${
                      chatChannel === 'proximity'
                        ? activeRoom?.name || 'nearby teammates'
                        : 'everyone in Green Valley'
                    }...`}
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer shrink-0"
                    title="Send Message"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}

            {/* Current Active Zone Footer Summary */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
              <div className="min-w-0">
                <div className="text-[11px] text-slate-400">Current Location</div>
                <div className="font-medium text-emerald-400 truncate">
                  {activeRoom ? activeRoom.name : 'Green Valley Grounds'}
                </div>
              </div>
              <button
                onClick={() =>
                  handleSetWalkTarget(currentUser.homeDeskX, currentUser.homeDeskY)
                }
                className="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                My Desk
              </button>
            </div>
          </aside>
        ) : (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-3 left-3 z-30 p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white shadow-lg cursor-pointer"
            title="Expand Workspace Sidebar"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        )}

        {/* CENTER VIEWPORT: SPATIAL MAP OR DIRECTORY/ROOMS OVERVIEWS */}
        <main className="flex-1 flex flex-col relative overflow-hidden">
          {/* Toast Notification Banner */}
          {toastNotification && (
            <div className="pointer-events-none absolute bottom-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-lg bg-slate-900/95 border border-slate-700 text-xs font-medium text-emerald-300 shadow-xl">
              {toastNotification}
            </div>
          )}

          {(activeNav === 'map' || activeNav === 'builder') && (
            <>
              <ProximityVideoHUD
                currentUser={currentUser}
                connectedTeammates={connectedTeammates}
                activeRoom={activeRoom}
                isMicOn={isMicOn}
                isCamOn={isCamOn}
                isScreenSharing={isScreenSharing}
                isBroadcasting={isBroadcasting}
                onToggleMic={() => setIsMicOn((m) => !m)}
                onToggleCam={() => setIsCamOn((c) => !c)}
                onToggleScreenShare={() => setIsScreenSharing((s) => !s)}
                onToggleRoomLock={handleToggleRoomLock}
                onWaveAtTeammate={handleWaveAtTeammate}
                onOpenRoomTool={(tool) => handleInteractWithObject(tool)}
              />

              <OfficeCanvas
                rooms={rooms}
                furniture={furniture}
                teammates={teammates}
                currentUser={currentUser}
                activeRoom={activeRoom}
                connectedTeammateIds={connectedTeammateIds}
                isBuilderMode={activeNav === 'builder'}
                selectedBuilderType={selectedBuilderType}
                onSelectBuilderType={setSelectedBuilderType}
                onPlaceFurniture={handlePlaceFurniture}
                onDeleteFurniture={handleDeleteFurniture}
                onSetWalkTarget={handleSetWalkTarget}
                onInteractWithObject={handleInteractWithObject}
                onWaveAtTeammate={handleWaveAtTeammate}
                showMinimap={showMinimap}
                onToggleMinimap={() => setShowMinimap((m) => !m)}
              />
            </>
          )}

          {/* MEETING ROOMS OVERVIEW VIEW */}
          {activeNav === 'rooms' && (
            <div className="flex-1 overflow-y-auto p-8 bg-slate-950">
              <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-end justify-between border-b border-slate-800 pb-5">
                  <div>
                    <h1 className="text-2xl font-bold text-white font-display">
                      Green Valley Campus · Rooms & Acoustic Zones
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                      Select any room to walk your avatar directly inside or launch its collaborative workspace tools.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveNav('map')}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white cursor-pointer whitespace-nowrap"
                  >
                    Return to Live Map
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {rooms.map((room) => {
                    const occupants = teammates.filter((t) => t.currentRoomId === room.id);
                    return (
                      <div
                        key={room.id}
                        className="p-6 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between gap-4"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h2 className="text-base font-semibold text-white">
                              {room.name}
                            </h2>
                            <span className="text-xs font-mono text-emerald-400 tabular-nums">
                              {occupants.length} / {room.capacity} occupied
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span>{room.category} Zone</span>
                            <span aria-hidden="true">·</span>
                            <span>{room.isLocked ? 'Locked Room' : 'Unlocked'}</span>
                            {room.isQuietZone && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>Noise-Isolated</span>
                              </>
                            )}
                          </div>

                          <p className="text-xs text-slate-300 leading-relaxed pt-1">
                            {room.description}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
                          <div className="text-xs text-slate-400 truncate">
                            {occupants.length > 0
                              ? `In room: ${occupants.map((o) => o.name).join(', ')}`
                              : 'Room currently empty'}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {room.interactiveActionType && (
                              <button
                                onClick={() =>
                                  handleInteractWithObject(room.interactiveActionType!)
                                }
                                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 cursor-pointer whitespace-nowrap"
                              >
                                Open Room Tool
                              </button>
                            )}
                            <button
                              onClick={() => handleWalkToRoom(room)}
                              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white cursor-pointer whitespace-nowrap"
                            >
                              Walk Inside
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TEAM DIRECTORY VIEW */}
          {activeNav === 'directory' && (
            <div className="flex-1 overflow-y-auto p-8 bg-slate-950">
              <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-end justify-between border-b border-slate-800 pb-5 flex-wrap gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-white font-display">
                      Green Valley Office · Team Directory
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                      Live spatial locations, active focus modes, and instant desk navigation.
                    </p>
                  </div>

                  {/* Interactive Department Filter Control */}
                  <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
                    {departments.map((dept) => (
                      <button
                        key={dept}
                        onClick={() => setDepartmentFilter(dept)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          departmentFilter === dept
                            ? 'bg-emerald-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {dept}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs text-slate-400 bg-slate-950/50">
                        <th className="py-3 px-4 font-medium">Teammate</th>
                        <th className="py-3 px-4 font-medium">Role & Squad</th>
                        <th className="py-3 px-4 font-medium">Current Room</th>
                        <th className="py-3 px-4 font-medium">Status</th>
                        <th className="py-3 px-4 font-medium text-right">Coordinates</th>
                        <th className="py-3 px-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70 text-xs">
                      {filteredTeammates.map((person) => {
                        const roomObj = rooms.find((r) => r.id === person.currentRoomId);
                        return (
                          <tr key={person.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 font-semibold text-white">
                              {person.name}
                            </td>
                            <td className="py-3 px-4 text-slate-300">
                              {person.role} · {person.department}
                            </td>
                            <td className="py-3 px-4 text-slate-300">
                              {roomObj ? roomObj.name : 'Central Valley Grounds'}
                            </td>
                            <td className="py-3 px-4 text-slate-300">
                              {person.status} · {person.statusMessage}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-400 tabular-nums">
                              {Math.round(person.x)}, {Math.round(person.y)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {!person.isCurrentUser ? (
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    onClick={() => handleWaveAtTeammate(person.id)}
                                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                                  >
                                    Wave
                                  </button>
                                  <button
                                    onClick={() => handleWalkToTeammate(person)}
                                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium cursor-pointer"
                                  >
                                    Walk To
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setIsAvatarModalOpen(true)}
                                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 cursor-pointer"
                                >
                                  Customize
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ADMIN MANAGEMENT CONSOLE VIEW */}
          {activeNav === 'admin' && (
            isAdminAuthenticated ? (
              <AdminPanel
                teammates={teammates}
                rooms={rooms}
                furniture={furniture}
                currentUser={currentUser}
                adminAnnouncement={adminAnnouncement}
                onUpdateAnnouncement={handleUpdateAnnouncement}
                onUpdateTeammate={handleUpdateTeammate}
                onRemoveTeammate={handleRemoveTeammate}
                onAddTeammate={handleAddTeammate}
                onTeleportTeammate={handleTeleportTeammate}
                onUpdateRoom={handleUpdateRoom}
                onSummonEveryoneToRoom={handleSummonEveryoneToRoom}
                onResetEveryoneToDesks={handleResetEveryoneToDesks}
                onGlobalMuteToggle={handleGlobalMuteToggle}
                onUpdateFurniture={handleUpdateFurniture}
                onDeleteFurniture={handleDeleteFurniture}
                onAddFurniture={(item) => {
                  setFurniture((prev) => [...prev, item]);
                  realtimeClient.sendFurnitureAdd(item);
                }}
                onResetFurnitureLayout={handleResetFurnitureLayout}
                onLogout={handleAdminLogout}
                onClose={() => setActiveNav('map')}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center bg-slate-950 p-6">
                <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
                    <Lock className="w-7 h-7" />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2 font-display">
                    Acesso Restrito ao Painel Admin
                  </h2>
                  <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                    O painel de gestão administrativa exige autenticação prévia para editar membros, salas, mobília ou executar comandos globais.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => setIsAdminLoginOpen(true)}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Fazer Login como Administrador</span>
                    </button>
                    <button
                      onClick={() => setActiveNav('map')}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors cursor-pointer"
                    >
                      Voltar ao Mapa
                    </button>
                  </div>
                </div>
              </div>
            )
          )}

          {/* SOWORK FLOATING BOTTOM CONTROL DOCK */}
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4">
            <div className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-slate-800 shadow-2xl">
              {/* Mic Toggle */}
              <button
                onClick={() => setIsMicOn((m) => !m)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  isMicOn
                    ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
                }`}
                title="Toggle Microphone (Shortcut: M)"
              >
                {isMicOn ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                <span>{isMicOn ? 'Mic On' : 'Muted'}</span>
              </button>

              {/* Camera Toggle */}
              <button
                onClick={() => setIsCamOn((c) => !c)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  isCamOn
                    ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-300'
                }`}
                title="Toggle Camera (Shortcut: V)"
              >
                {isCamOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                <span>{isCamOn ? 'Video' : 'Cam Off'}</span>
              </button>

              {/* Screen Share */}
              <button
                onClick={() => {
                  setIsScreenSharing((s) => !s);
                  showToast(
                    !isScreenSharing
                      ? 'Started sharing screen with nearby teammates'
                      : 'Stopped screen sharing'
                  );
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  isScreenSharing
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
                title="Share Screen in Room"
              >
                <MonitorUp className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Share Screen</span>
              </button>

              <div className="h-5 w-px bg-slate-800 mx-1" />

              {/* Quick Emoji Reactions */}
              <div className="hidden lg:flex items-center gap-1">
                {REACTION_EMOJIS.map((item) => (
                  <button
                    key={item.emoji}
                    onClick={() => handleTriggerReaction(item.emoji, item.label)}
                    className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-sm transition-transform hover:scale-110 cursor-pointer"
                    title={item.label}
                  >
                    {item.emoji}
                  </button>
                ))}
              </div>

              <div className="hidden lg:block h-5 w-px bg-slate-800 mx-1" />

              {/* Interactive Room Quick Actions */}
              <button
                onClick={() => setIsWhiteboardOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                title="Open Collaborative Whiteboard"
              >
                <PenTool className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline">Whiteboard</span>
              </button>

              <button
                onClick={() => setIsSprintBoardOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                title="Open Engineering Sprint Board"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden md:inline">Sprint Wall</span>
              </button>

              <button
                onClick={() => handleInteractWithObject('jukebox')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  cafeLoFiPlaying
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
                title="Toggle Valley Café Lo-Fi Ambient Synth"
              >
                <Coffee className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden xl:inline">Café Lo-Fi</span>
              </button>

              <button
                onClick={() => handleInteractWithObject('broadcast')}
                className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                  isBroadcasting
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
                title="Toggle Town Hall All-Hands Broadcast"
              >
                <Radio className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  const next = !soundEffectsOn;
                  setSoundEffectsOn(next);
                  soundEngine.enabled = next;
                  if (!next) {
                    soundEngine.stopAmbient();
                    setCafeLoFiPlaying(false);
                  }
                }}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                title={soundEffectsOn ? 'Mute Spatial Sound Effects' : 'Enable Spatial Sound Effects'}
              >
                {soundEffectsOn ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
              </button>

              <button
                onClick={() => setIsAvatarModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                title="Customize Avatar & Status"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Avatar</span>
              </button>

              {/* Admin Panel Quick Toggle in Bottom Dock */}
              <button
                onClick={() => {
                  if (isAdminAuthenticated) {
                    setActiveNav(activeNav === 'admin' ? 'map' : 'admin');
                  } else {
                    setIsAdminLoginOpen(true);
                  }
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  activeNav === 'admin'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
                title={
                  isAdminAuthenticated
                    ? 'Abrir Painel de Gestão do Administrador (Conectado)'
                    : 'Fazer Login no Painel de Administrador'
                }
              >
                <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Admin</span>
                {!isAdminAuthenticated && <Lock className="w-3 h-3 text-slate-400" />}
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* INTERACTIVE MODALS */}
      <WhiteboardModal
        isOpen={isWhiteboardOpen}
        onClose={() => setIsWhiteboardOpen(false)}
        stickyNotes={stickyNotes}
        onAddStickyNote={(text, color) => {
          const newNote = {
            id: `note-${Date.now()}`,
            text,
            author: currentUser.name,
            color,
            x: 80,
            y: 80,
          };
          setStickyNotes((prev) => [...prev, newNote]);
          realtimeClient.sendWhiteboardNoteAdd(newNote);
        }}
        onDeleteStickyNote={(id) => {
          setStickyNotes((prev) => prev.filter((n) => n.id !== id));
          realtimeClient.sendWhiteboardNoteDelete(id);
        }}
      />

      <SprintBoardModal
        isOpen={isSprintBoardOpen}
        onClose={() => setIsSprintBoardOpen(false)}
        tasks={sprintTasks}
        onMoveTask={(taskId, nextStatus) => {
          setSprintTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t))
          );
          realtimeClient.sendSprintTaskMove(taskId, nextStatus);
        }}
        onAddTask={(title, assignee, estimate) => {
          const newTask = {
            id: `TASK-${420 + sprintTasks.length}`,
            title,
            assignee,
            department: 'Core Platform',
            status: 'Backlog' as const,
            estimate,
          };
          setSprintTasks((prev) => [...prev, newTask]);
          realtimeClient.sendSprintTaskAdd(newTask);
        }}
      />

      <AvatarCustomizerModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        currentUser={currentUser}
        onUpdateProfile={handleUpdateProfile}
      />

      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSpawnGuestTeammate={handleSpawnGuestTeammate}
      />

      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onSuccess={handleAdminLoginSuccess}
        onCancel={() => {
          setIsAdminLoginOpen(false);
          if (activeNav === 'admin' && !isAdminAuthenticated) {
            setActiveNav('map');
          }
        }}
      />
    </div>
  );
}
