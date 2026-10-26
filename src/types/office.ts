export type UserPresenceStatus = 'Available' | 'Deep Focus' | 'In a Meeting' | 'Stepping Out';

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface AvatarConfig {
  skinColor: string;
  hairColor: string;
  shirtColor: string;
  hairStyle: 'short' | 'curly' | 'bun' | 'parted';
  accessory: 'none' | 'glasses' | 'headset' | 'beanie';
}

export interface RoomZone {
  id: string;
  name: string;
  category: 'Collaborative' | 'Meeting' | 'Focus' | 'Social' | 'Outdoor' | 'Stage';
  x: number;
  y: number;
  width: number;
  height: number;
  floorType: 'wood' | 'carpet-slate' | 'carpet-emerald' | 'stone' | 'tile-cafe' | 'stage-oak';
  wallColor: string;
  accentColor: string;
  capacity: number;
  isLocked: boolean;
  isQuietZone?: boolean;
  isBroadcastStage?: boolean;
  interactiveObjectLabel?: string;
  interactiveActionType?: 'whiteboard' | 'sprint-board' | 'jukebox' | 'broadcast' | 'coffee';
  description: string;
}

export type FurnitureCategory =
  | 'desk-pod'
  | 'conference-table'
  | 'couch'
  | 'cafe-bar'
  | 'plant-monstera'
  | 'plant-pine'
  | 'whiteboard-easel'
  | 'sprint-kiosk'
  | 'fountain'
  | 'podium'
  | 'bookshelf'
  | 'arcade-cabinet'
  | 'garden-bench'
  | 'focus-desk';

export interface FurnitureItem {
  id: string;
  type: FurnitureCategory;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  roomId?: string;
  interactiveType?: 'whiteboard' | 'sprint-board' | 'jukebox' | 'broadcast' | 'coffee' | 'claim-desk';
  claimedBy?: string;
}

export interface Teammate {
  id: string;
  name: string;
  role: string;
  department: string;
  status: UserPresenceStatus;
  statusMessage: string;
  x: number;
  y: number;
  targetX?: number;
  targetY?: number;
  direction: Direction;
  isWalking: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing?: boolean;
  isCurrentUser?: boolean;
  avatar: AvatarConfig;
  currentRoomId: string | null;
  speechBubble?: string | null;
  speechTimestamp?: number;
  activeReaction?: string | null;
  reactionTimestamp?: number;
  homeDeskX: number;
  homeDeskY: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  text: string;
  timestamp: string;
  channel: 'proximity' | 'office-wide' | 'room';
  roomId?: string | null;
}

export interface SprintTask {
  id: string;
  title: string;
  assignee: string;
  department: string;
  status: 'Backlog' | 'In Progress' | 'Review' | 'Done';
  estimate: string;
}

export interface StickyNote {
  id: string;
  text: string;
  author: string;
  color: string;
  x: number;
  y: number;
}
