import React, { useEffect, useRef, useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Compass,
  Sparkles,
  Trash2,
  MousePointerClick,
  Map as MapIcon,
} from 'lucide-react';
import {
  FurnitureCategory,
  FurnitureItem,
  RoomZone,
  Teammate,
} from '../types/office';
import { DECORATIVE_TREES, WORKSPACE_METADATA } from '../data/greenValleyData';

interface OfficeCanvasProps {
  rooms: RoomZone[];
  furniture: FurnitureItem[];
  teammates: Teammate[];
  currentUser: Teammate;
  activeRoom: RoomZone | null;
  connectedTeammateIds: Set<string>;
  isBuilderMode: boolean;
  selectedBuilderType: FurnitureCategory;
  onSelectBuilderType: (t: FurnitureCategory) => void;
  onPlaceFurniture: (x: number, y: number, type: FurnitureCategory) => void;
  onDeleteFurniture: (id: string) => void;
  onSetWalkTarget: (x: number, y: number) => void;
  onInteractWithObject: (actionType: 'whiteboard' | 'sprint-board' | 'jukebox' | 'broadcast' | 'coffee' | 'claim-desk', item?: FurnitureItem) => void;
  onWaveAtTeammate: (teammateId: string) => void;
  showMinimap: boolean;
  onToggleMinimap: () => void;
}

const BUILDER_PALETTE: { type: FurnitureCategory; label: string }[] = [
  { type: 'desk-pod', label: 'Dual-Monitor Desk' },
  { type: 'couch', label: 'Lounge Sofa' },
  { type: 'plant-monstera', label: 'Indoor Monstera' },
  { type: 'garden-bench', label: 'Courtyard Bench' },
  { type: 'whiteboard-easel', label: 'Whiteboard Easel' },
  { type: 'arcade-cabinet', label: 'Arcade Station' },
];

export const OfficeCanvas: React.FC<OfficeCanvasProps> = ({
  rooms,
  furniture,
  teammates,
  currentUser,
  activeRoom,
  connectedTeammateIds,
  isBuilderMode,
  selectedBuilderType,
  onSelectBuilderType,
  onPlaceFurniture,
  onDeleteFurniture,
  onSetWalkTarget,
  onInteractWithObject,
  onWaveAtTeammate,
  showMinimap,
  onToggleMinimap,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [zoom, setZoom] = useState(0.88);
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
  const [followAvatar, setFollowAvatar] = useState(true);
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, camX: 0, camY: 0, moved: false });
  const [walkRipple, setWalkRipple] = useState<{ x: number; y: number; time: number } | null>(null);
  const [hoveredFurniture, setHoveredFurniture] = useState<FurnitureItem | null>(null);
  const [hoveredTeammate, setHoveredTeammate] = useState<Teammate | null>(null);

  // Find closest interactive object within 115px of currentUser
  const nearbyInteractiveItem = React.useMemo(() => {
    let closest: FurnitureItem | null = null;
    let minDist = 115;
    for (const item of furniture) {
      if (!item.interactiveType) continue;
      const dx = item.x - currentUser.x;
      const dy = item.y - currentUser.y;
      const dist = Math.hypot(dx, dy);
      if (dist < minDist) {
        minDist = dist;
        closest = item;
      }
    }
    return closest;
  }, [furniture, currentUser.x, currentUser.y]);

  // Press 'E' keyboard shortcut to interact with nearby object
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }
      if ((e.key === 'e' || e.key === 'E') && nearbyInteractiveItem?.interactiveType) {
        e.preventDefault();
        onInteractWithObject(nearbyInteractiveItem.interactiveType, nearbyInteractiveItem);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nearbyInteractiveItem, onInteractWithObject]);

  // Resize canvas to match viewport container
  useEffect(() => {
    const updateSize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = container.clientWidth * dpr;
      canvas.height = container.clientHeight * dpr;
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Main 60fps Canvas Render Loop
  useEffect(() => {
    let animationFrameId: number;

    const render = (timestamp: number) => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const viewW = container.clientWidth;
      const viewH = container.clientHeight;

      ctx.save();
      ctx.scale(dpr, dpr);

      // Compute camera center
      const focusX = followAvatar ? currentUser.x : WORKSPACE_METADATA.mapWidth / 2 - cameraOffset.x;
      const focusY = followAvatar ? currentUser.y : WORKSPACE_METADATA.mapHeight / 2 - cameraOffset.y;

      // Clear viewport with deep botanical night-emerald canvas
      ctx.fillStyle = '#07110e';
      ctx.fillRect(0, 0, viewW, viewH);

      // Apply camera transform
      ctx.translate(viewW / 2, viewH / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-focusX, -focusY);

      // 1. Draw Green Valley Outdoor Campus Grounds
      const mapW = WORKSPACE_METADATA.mapWidth;
      const mapH = WORKSPACE_METADATA.mapHeight;

      // Outer valley lawn
      const lawnGrad = ctx.createRadialGradient(mapW / 2, mapH / 2, 180, mapW / 2, mapH / 2, 1250);
      lawnGrad.addColorStop(0, '#0d261d');
      lawnGrad.addColorStop(0.65, '#091c15');
      lawnGrad.addColorStop(1, '#06120e');
      ctx.fillStyle = lawnGrad;
      ctx.beginPath();
      ctx.roundRect(0, 0, mapW, mapH, 36);
      ctx.fill();

      // Subtle outdoor botanical grid texture
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.04)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx <= mapW; gx += 40) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, mapH);
        ctx.stroke();
      }
      for (let gy = 0; gy <= mapH; gy += 40) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(mapW, gy);
        ctx.stroke();
      }

      // Outdoor Stone Pathways connecting Courtyard to surrounding buildings
      ctx.fillStyle = '#1e293b';
      // Horizontal main promenade
      ctx.fillRect(680, 620, 640, 76);
      // Vertical central avenue
      ctx.fillRect(960, 420, 80, 480);

      // Stepping stone details
      ctx.fillStyle = '#334155';
      for (let sx = 700; sx < 1300; sx += 44) {
        ctx.beginPath();
        ctx.roundRect(sx, 634, 30, 20, 4);
        ctx.roundRect(sx + 10, 662, 28, 20, 4);
        ctx.fill();
      }

      // 2. Render Architectural Room Zones
      for (const room of rooms) {
        const isUserInside = activeRoom?.id === room.id;

        ctx.save();
        // Room drop shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 8;

        // Room base fill
        if (room.floorType === 'wood') {
          ctx.fillStyle = '#1e1b18';
        } else if (room.floorType === 'carpet-emerald') {
          ctx.fillStyle = '#0d231f';
        } else if (room.floorType === 'carpet-slate') {
          ctx.fillStyle = '#131c2e';
        } else if (room.floorType === 'tile-cafe') {
          ctx.fillStyle = '#231c18';
        } else if (room.floorType === 'stone') {
          ctx.fillStyle = '#132a23';
        } else {
          ctx.fillStyle = '#1f1924';
        }

        ctx.beginPath();
        ctx.roundRect(room.x, room.y, room.width, room.height, 18);
        ctx.fill();
        ctx.restore();

        // Floor texture details
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(room.x, room.y, room.width, room.height, 18);
        ctx.clip();

        if (room.floorType === 'wood' || room.floorType === 'stage-oak') {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
          ctx.lineWidth = 1;
          for (let py = room.y + 24; py < room.y + room.height; py += 24) {
            ctx.beginPath();
            ctx.moveTo(room.x, py);
            ctx.lineTo(room.x + room.width, py);
            ctx.stroke();
          }
        } else if (room.floorType === 'tile-cafe') {
          ctx.fillStyle = 'rgba(245, 158, 11, 0.035)';
          for (let tx = room.x; tx < room.x + room.width; tx += 40) {
            for (let ty = room.y; ty < room.y + room.height; ty += 40) {
              if (((tx + ty) / 40) % 2 === 0) {
                ctx.fillRect(tx, ty, 40, 40);
              }
            }
          }
        } else if (room.floorType === 'carpet-emerald' || room.floorType === 'carpet-slate') {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
          for (let dx = room.x + 20; dx < room.x + room.width; dx += 28) {
            for (let dy = room.y + 20; dy < room.y + room.height; dy += 28) {
              ctx.fillRect(dx, dy, 2, 2);
            }
          }
        }

        // Dim outside rooms slightly if user is inside a Quiet Focus Pod
        if (activeRoom?.isQuietZone && !isUserInside) {
          ctx.fillStyle = 'rgba(6, 11, 19, 0.45)';
          ctx.fillRect(room.x, room.y, room.width, room.height);
        }

        ctx.restore();

        // Architectural Wall Border
        ctx.strokeStyle = isUserInside ? room.accentColor : 'rgba(148, 163, 184, 0.25)';
        ctx.lineWidth = isUserInside ? 3 : 2;
        ctx.beginPath();
        ctx.roundRect(room.x, room.y, room.width, room.height, 18);
        ctx.stroke();

        // Room Header Label Bar
        const occupantsCount = teammates.filter((t) => t.currentRoomId === room.id).length;
        ctx.fillStyle = isUserInside ? 'rgba(15, 23, 42, 0.92)' : 'rgba(15, 23, 42, 0.78)';
        ctx.beginPath();
        ctx.roundRect(room.x + 16, room.y + 14, Math.min(room.width - 32, 310), 32, 8);
        ctx.fill();

        ctx.fillStyle = isUserInside ? '#ffffff' : '#cbd5e1';
        ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(room.name, room.x + 28, room.y + 34);

        // Occupancy count on right of header bar
        const occText = `${occupantsCount}/${room.capacity}`;
        ctx.font = '500 11px "JetBrains Mono", monospace';
        ctx.fillStyle = isUserInside ? '#34d399' : '#94a3b8';
        ctx.fillText(occText, room.x + Math.min(room.width - 32, 310) - 26, room.y + 34);

        if (room.isLocked) {
          ctx.fillStyle = '#fbbf24';
          ctx.font = '600 10px "JetBrains Mono", monospace';
          ctx.fillText('LOCKED', room.x + room.width - 68, room.y + 32);
        }
      }

      // 3. Render Furniture & Interactive Room Objects
      for (const item of furniture) {
        const isNearby = nearbyInteractiveItem?.id === item.id;
        const isHovered = hoveredFurniture?.id === item.id;

        ctx.save();
        ctx.translate(item.x, item.y);

        // Highlight ring if interactive and nearby/hovered
        if (isNearby || isHovered) {
          ctx.strokeStyle = isNearby ? '#10b981' : '#38bdf8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(-item.width / 2 - 6, -item.height / 2 - 6, item.width + 12, item.height + 12, 12);
          ctx.stroke();
        }

        switch (item.type) {
          case 'fountain': {
            // Circular stone basin
            ctx.fillStyle = '#334155';
            ctx.beginPath();
            ctx.arc(0, 0, item.width / 2, 0, Math.PI * 2);
            ctx.fill();

            // Animated water pool
            const pulse = Math.sin(timestamp * 0.003) * 3;
            ctx.fillStyle = '#0284c7';
            ctx.beginPath();
            ctx.arc(0, 0, item.width / 2 - 9, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = 'rgba(186, 230, 253, 0.45)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, 22 + pulse, 0, Math.PI * 2);
            ctx.stroke();

            // Botanical center planter
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.arc(0, 0, 12, 0, Math.PI * 2);
            ctx.fill();
            break;
          }

          case 'desk-pod':
          case 'focus-desk': {
            // Ergonomic chair behind desk
            ctx.fillStyle = '#334155';
            ctx.beginPath();
            ctx.arc(0, 22, 14, 0, Math.PI * 2);
            ctx.fill();

            // Desk wood surface
            ctx.fillStyle = item.type === 'focus-desk' ? '#312e81' : '#475569';
            ctx.beginPath();
            ctx.roundRect(-item.width / 2, -item.height / 2, item.width, item.height - 16, 8);
            ctx.fill();

            // Dual Ultra-Wide Monitors
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(-34, -item.height / 2 + 6, 30, 8);
            ctx.fillRect(4, -item.height / 2 + 6, 30, 8);

            // Screen glow
            ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
            ctx.fillRect(-32, -item.height / 2 + 14, 26, 4);
            ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
            ctx.fillRect(6, -item.height / 2 + 14, 26, 4);

            // Keyboard & Laptop mat
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(-14, -6, 28, 10);

            // Claimed owner badge
            if (item.claimedBy) {
              ctx.fillStyle = '#94a3b8';
              ctx.font = '500 10px "DM Sans", sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(item.claimedBy, 0, -item.height / 2 - 6);
            }
            break;
          }

          case 'conference-table': {
            // Surrounding meeting chairs
            ctx.fillStyle = '#1e293b';
            for (let cx = -90; cx <= 90; cx += 45) {
              ctx.beginPath();
              ctx.arc(cx, -item.height / 2 - 8, 11, 0, Math.PI * 2);
              ctx.arc(cx, item.height / 2 + 8, 11, 0, Math.PI * 2);
              ctx.fill();
            }
            // Oak table surface
            ctx.fillStyle = '#3f2e21';
            ctx.strokeStyle = '#5c4028';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(-item.width / 2, -item.height / 2, item.width, item.height, 20);
            ctx.fill();
            ctx.stroke();

            // Center conference speakerphone & laptops
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.roundRect(-24, -12, 48, 24, 6);
            ctx.fill();
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI * 2);
            ctx.fill();
            break;
          }

          case 'whiteboard-easel':
          case 'sprint-kiosk': {
            ctx.fillStyle = item.type === 'whiteboard-easel' ? '#f8fafc' : '#1e1b4b';
            ctx.strokeStyle = item.type === 'whiteboard-easel' ? '#10b981' : '#818cf8';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.roundRect(-item.width / 2, -item.height / 2, item.width, item.height, 6);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = item.type === 'whiteboard-easel' ? '#0f172a' : '#e0e7ff';
            ctx.font = '600 10px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(
              item.type === 'whiteboard-easel' ? 'WHITEBOARD [E]' : 'SPRINT WALL [E]',
              0,
              4
            );
            break;
          }

          case 'cafe-bar': {
            ctx.fillStyle = '#451a03';
            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(-item.width / 2, -item.height / 2, item.width, item.height, 10);
            ctx.fill();
            ctx.stroke();

            // Espresso machine
            ctx.fillStyle = '#cbd5e1';
            ctx.fillRect(-item.width / 2 + 18, -18, 42, 28);
            // Bar stools
            ctx.fillStyle = '#78350f';
            for (let sx = -70; sx <= 70; sx += 35) {
              ctx.beginPath();
              ctx.arc(sx, item.height / 2 + 12, 9, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.fillStyle = '#fef3c7';
            ctx.font = '600 10px "Plus Jakarta Sans", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('ESPRESSO & LO-FI BAR [E]', 20, 4);
            break;
          }

          case 'couch': {
            ctx.fillStyle = '#334155';
            ctx.beginPath();
            ctx.roundRect(-item.width / 2, -item.height / 2, item.width, item.height, 12);
            ctx.fill();
            ctx.fillStyle = '#475569';
            ctx.beginPath();
            ctx.roundRect(-item.width / 2 + 8, -item.height / 2 + 10, item.width - 16, item.height - 16, 8);
            ctx.fill();
            break;
          }

          case 'podium': {
            ctx.fillStyle = '#500724';
            ctx.strokeStyle = '#f43f5e';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(-item.width / 2, -item.height / 2, item.width, item.height, 10);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#ffe4e6';
            ctx.font = '600 10px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('STAGE PODIUM [E]', 0, 4);
            break;
          }

          case 'plant-monstera':
          case 'plant-pine': {
            ctx.fillStyle = '#78350f';
            ctx.beginPath();
            ctx.arc(0, 0, 13, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#10b981';
            for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
              ctx.beginPath();
              ctx.ellipse(Math.cos(a) * 10, Math.sin(a) * 10, 9, 5, a, 0, Math.PI * 2);
              ctx.fill();
            }
            break;
          }

          case 'garden-bench': {
            ctx.fillStyle = '#78350f';
            ctx.beginPath();
            ctx.roundRect(-item.width / 2, -item.height / 2, item.width, item.height, 6);
            ctx.fill();
            break;
          }

          default: {
            ctx.fillStyle = '#334155';
            ctx.beginPath();
            ctx.roundRect(-item.width / 2, -item.height / 2, item.width, item.height, 8);
            ctx.fill();
            break;
          }
        }

        ctx.restore();
      }

      // 4. Render Outdoor Perimeter Pine & Oak Trees
      for (const tree of DECORATIVE_TREES) {
        ctx.save();
        ctx.translate(tree.x, tree.y);
        ctx.scale(tree.scale, tree.scale);

        // Tree shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(4, 8, 26, 18, 0, 0, Math.PI * 2);
        ctx.fill();

        // Outer canopy
        ctx.fillStyle = tree.variety === 'pine' ? '#064e3b' : '#065f46';
        ctx.beginPath();
        ctx.arc(0, 0, 26, 0, Math.PI * 2);
        ctx.fill();

        // Inner canopy highlight
        ctx.fillStyle = tree.variety === 'pine' ? '#047857' : '#10b981';
        ctx.beginPath();
        ctx.arc(-4, -4, 17, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // 5. Render Click-to-Walk Destination Ripple
      if (walkRipple) {
        const age = timestamp - walkRipple.time;
        if (age < 750) {
          const progress = age / 750;
          ctx.save();
          ctx.strokeStyle = `rgba(16, 185, 129, ${1 - progress})`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(walkRipple.x, walkRipple.y, 8 + progress * 24, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      // 6. Render Current User's Proximity Audio Bubble (when outdoors or in open zone)
      ctx.save();
      const proxGrad = ctx.createRadialGradient(
        currentUser.x,
        currentUser.y,
        24,
        currentUser.x,
        currentUser.y,
        WORKSPACE_METADATA.proximityRadius
      );
      proxGrad.addColorStop(0, 'rgba(16, 185, 129, 0.08)');
      proxGrad.addColorStop(0.85, 'rgba(16, 185, 129, 0.03)');
      proxGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
      ctx.fillStyle = proxGrad;
      ctx.beginPath();
      ctx.arc(currentUser.x, currentUser.y, WORKSPACE_METADATA.proximityRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(16, 185, 129, 0.22)';
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(currentUser.x, currentUser.y, WORKSPACE_METADATA.proximityRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 7. Render All Teammates & Current User Avatars (sorted by Y for depth)
      const sortedAvatars = [...teammates].sort((a, b) => a.y - b.y);

      for (const person of sortedAvatars) {
        const isMe = Boolean(person.isCurrentUser);
        const isConnected = isMe || connectedTeammateIds.has(person.id);
        const bobOffset = person.isWalking ? Math.sin(timestamp * 0.018) * 3.5 : 0;

        ctx.save();
        ctx.translate(person.x, person.y + bobOffset);

        // Connection line between currentUser and nearby connected teammates
        if (!isMe && isConnected) {
          ctx.save();
          ctx.strokeStyle = 'rgba(52, 211, 153, 0.22)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, -bobOffset);
          ctx.lineTo(currentUser.x - person.x, currentUser.y - person.y - bobOffset);
          ctx.stroke();
          ctx.restore();
        }

        // Ground shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(0, 18 - bobOffset, 16, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Speaking ring
        if (person.isSpeaking && !person.isMuted) {
          const ringScale = 1 + Math.sin(timestamp * 0.012) * 0.12;
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(0, 0, 23 * ringScale, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Avatar Body / Shoulders
        ctx.fillStyle = person.avatar.shirtColor;
        ctx.beginPath();
        ctx.roundRect(-14, -4, 28, 20, 9);
        ctx.fill();

        // Avatar Head
        ctx.fillStyle = person.avatar.skinColor;
        ctx.beginPath();
        ctx.arc(0, -10, 12, 0, Math.PI * 2);
        ctx.fill();

        // Hair
        ctx.fillStyle = person.avatar.hairColor;
        ctx.beginPath();
        ctx.arc(0, -13, 12, Math.PI, Math.PI * 2);
        ctx.fill();
        if (person.avatar.hairStyle === 'bun') {
          ctx.beginPath();
          ctx.arc(0, -25, 5.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Eyes (directional)
        const eyeOffsetX = person.direction === 'left' ? -3 : person.direction === 'right' ? 3 : 0;
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(-3.5 + eyeOffsetX, -9, 1.6, 0, Math.PI * 2);
        ctx.arc(3.5 + eyeOffsetX, -9, 1.6, 0, Math.PI * 2);
        ctx.fill();

        // Glasses or Headset accessory
        if (person.avatar.accessory === 'glasses') {
          ctx.strokeStyle = '#f8fafc';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(-7 + eyeOffsetX, -12, 6, 5);
          ctx.strokeRect(1 + eyeOffsetX, -12, 6, 5);
        } else if (person.avatar.accessory === 'headset') {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, -10, 13, Math.PI * 1.1, Math.PI * 1.9);
          ctx.stroke();
        }

        // Floating Nameplate below avatar
        ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
        const nameW = ctx.measureText(person.name).width + 24;
        ctx.fillStyle = isMe ? 'rgba(6, 78, 59, 0.95)' : 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = isMe ? '#10b981' : 'rgba(148, 163, 184, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(-nameW / 2, 23, nameW, 20, 6);
        ctx.fill();
        ctx.stroke();

        // Status indicator dot on nameplate
        ctx.fillStyle =
          person.status === 'Available'
            ? '#10b981'
            : person.status === 'Deep Focus'
            ? '#a855f7'
            : person.status === 'In a Meeting'
            ? '#f59e0b'
            : '#64748b';
        ctx.beginPath();
        ctx.arc(-nameW / 2 + 8, 33, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f8fafc';
        ctx.textAlign = 'center';
        ctx.fillText(person.name, 4, 37);

        // Floating Speech Bubble above avatar
        if (person.speechBubble) {
          ctx.font = '500 11px "DM Sans", sans-serif';
          const bubbleText =
            person.speechBubble.length > 42
              ? person.speechBubble.slice(0, 40) + '...'
              : person.speechBubble;
          const bw = ctx.measureText(bubbleText).width + 20;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
          ctx.beginPath();
          ctx.roundRect(-bw / 2, -52, bw, 22, 8);
          ctx.fill();

          ctx.fillStyle = '#0f172a';
          ctx.textAlign = 'center';
          ctx.fillText(bubbleText, 0, -37);
        }

        // Floating Active Emoji Reaction
        if (person.activeReaction) {
          const reactFloat = Math.sin(timestamp * 0.015) * 4;
          ctx.font = '20px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(person.activeReaction, 0, -58 + reactFloat);
        }

        ctx.restore();
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    rooms,
    furniture,
    teammates,
    currentUser,
    activeRoom,
    connectedTeammateIds,
    zoom,
    cameraOffset,
    followAvatar,
    walkRipple,
    nearbyInteractiveItem,
    hoveredFurniture,
  ]);

  // Convert screen mouse event to world map coordinates
  const screenToWorld = (clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    const viewW = container.clientWidth;
    const viewH = container.clientHeight;

    const focusX = followAvatar ? currentUser.x : WORKSPACE_METADATA.mapWidth / 2 - cameraOffset.x;
    const focusY = followAvatar ? currentUser.y : WORKSPACE_METADATA.mapHeight / 2 - cameraOffset.y;

    const worldX = (clientX - rect.left - viewW / 2) / zoom + focusX;
    const worldY = (clientY - rect.top - viewH / 2) / zoom + focusY;
    return {
      x: Math.max(40, Math.min(WORKSPACE_METADATA.mapWidth - 40, Math.round(worldX))),
      y: Math.max(40, Math.min(WORKSPACE_METADATA.mapHeight - 40, Math.round(worldY))),
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      camX: cameraOffset.x,
      camY: cameraOffset.y,
      moved: false,
    };
    setIsDraggingMap(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const worldPos = screenToWorld(e.clientX, e.clientY);

    // Check hovered furniture or teammate
    const foundFurn = furniture.find(
      (f) =>
        Math.abs(f.x - worldPos.x) <= f.width / 2 + 8 &&
        Math.abs(f.y - worldPos.y) <= f.height / 2 + 8
    );
    setHoveredFurniture(foundFurn || null);

    const foundPerson = teammates.find(
      (t) => !t.isCurrentUser && Math.hypot(t.x - worldPos.x, t.y - worldPos.y) <= 26
    );
    setHoveredTeammate(foundPerson || null);

    if (!isDraggingMap) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.hypot(dx, dy) > 6) {
      dragStartRef.current.moved = true;
      setFollowAvatar(false);
      setCameraOffset({
        x: dragStartRef.current.camX + dx / zoom,
        y: dragStartRef.current.camY + dy / zoom,
      });
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDraggingMap(false);
    if (dragStartRef.current.moved) return;

    const worldPos = screenToWorld(e.clientX, e.clientY);

    // If Office Builder Mode is active, place furniture
    if (isBuilderMode) {
      onPlaceFurniture(worldPos.x, worldPos.y, selectedBuilderType);
      return;
    }

    // Check if user clicked a teammate to wave
    const clickedPerson = teammates.find(
      (t) => !t.isCurrentUser && Math.hypot(t.x - worldPos.x, t.y - worldPos.y) <= 28
    );
    if (clickedPerson) {
      onWaveAtTeammate(clickedPerson.id);
      onSetWalkTarget(clickedPerson.x - 48, clickedPerson.y + 12);
      setWalkRipple({ x: clickedPerson.x - 48, y: clickedPerson.y + 12, time: performance.now() });
      return;
    }

    // Check if user clicked an interactive furniture object
    const clickedInteractive = furniture.find(
      (f) =>
        f.interactiveType &&
        Math.abs(f.x - worldPos.x) <= f.width / 2 + 12 &&
        Math.abs(f.y - worldPos.y) <= f.height / 2 + 12
    );
    if (clickedInteractive && clickedInteractive.interactiveType) {
      const dist = Math.hypot(clickedInteractive.x - currentUser.x, clickedInteractive.y - currentUser.y);
      if (dist <= 160) {
        onInteractWithObject(clickedInteractive.interactiveType, clickedInteractive);
        return;
      }
    }

    // Otherwise, set click-to-walk target
    setWalkRipple({ x: worldPos.x, y: worldPos.y, time: performance.now() });
    onSetWalkTarget(worldPos.x, worldPos.y);
  };

  return (
    <div ref={containerRef} className="relative flex-1 h-full overflow-hidden bg-slate-950 select-none">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`w-full h-full block ${
          isBuilderMode
            ? 'cursor-cell'
            : hoveredFurniture?.interactiveType || hoveredTeammate
            ? 'cursor-pointer'
            : isDraggingMap
            ? 'cursor-grabbing'
            : 'cursor-default'
        }`}
      />

      {/* Interactive Object Proximity Prompt Banner */}
      {nearbyInteractiveItem && !isBuilderMode && (
        <div className="absolute bottom-22 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-900/95 border border-emerald-500/50 shadow-xl text-xs">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-slate-200 font-medium">{nearbyInteractiveItem.label}</span>
          <button
            onClick={() =>
              nearbyInteractiveItem.interactiveType &&
              onInteractWithObject(nearbyInteractiveItem.interactiveType, nearbyInteractiveItem)
            }
            className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            Interact (Press E)
          </button>
        </div>
      )}

      {/* Office Builder Mode Floating Palette */}
      {isBuilderMode && (
        <div className="absolute top-4 left-4 z-20 w-72 p-4 rounded-xl bg-slate-900/95 backdrop-blur-md border border-emerald-500/40 shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400">
              Green Valley Floorplan Builder
            </span>
            <span className="text-[11px] font-mono text-slate-400">Click map to place</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {BUILDER_PALETTE.map((item) => (
              <button
                key={item.type}
                onClick={() => onSelectBuilderType(item.type)}
                className={`px-2.5 py-2 rounded-lg text-left text-xs font-medium transition-colors cursor-pointer ${
                  selectedBuilderType === item.type
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {hoveredFurniture && (
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-300 truncate">{hoveredFurniture.label}</span>
              <button
                onClick={() => onDeleteFurniture(hoveredFurniture.id)}
                className="flex items-center gap-1 text-rose-400 hover:text-rose-300 cursor-pointer shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bottom-Left Movement & Coordinates Overlay */}
      <div className="hidden sm:flex items-center gap-2.5 absolute bottom-4 left-4 z-10 px-3 py-1.5 rounded-lg bg-slate-900/85 backdrop-blur-md border border-slate-800 text-[11px] text-slate-400">
        <MousePointerClick className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>Click floor to walk or use WASD / Arrows</span>
        <span aria-hidden="true">·</span>
        <span className="font-mono text-slate-300 tabular-nums">
          X:{Math.round(currentUser.x)} Y:{Math.round(currentUser.y)}
        </span>
      </div>

      {/* Bottom-Right Map Camera & Minimap Controls */}
      <div className="absolute bottom-4 right-4 z-20 flex flex-col items-end gap-2">
        {showMinimap && (
          <div className="w-52 h-36 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-800 p-2 shadow-xl relative overflow-hidden">
            <div className="text-[10px] font-medium text-slate-400 mb-1 flex items-center justify-between">
              <span>Campus Radar</span>
              <span className="font-mono tabular-nums">{Math.round(zoom * 100)}%</span>
            </div>
            <div className="relative w-full h-26 bg-slate-950 rounded-lg border border-slate-800/80 overflow-hidden">
              {rooms.map((r) => (
                <div
                  key={r.id}
                  onClick={() => onSetWalkTarget(r.x + r.width / 2, r.y + r.height / 2)}
                  className="absolute border border-slate-700/80 hover:border-emerald-400 transition-colors cursor-pointer rounded-xs"
                  style={{
                    left: `${(r.x / WORKSPACE_METADATA.mapWidth) * 100}%`,
                    top: `${(r.y / WORKSPACE_METADATA.mapHeight) * 100}%`,
                    width: `${(r.width / WORKSPACE_METADATA.mapWidth) * 100}%`,
                    height: `${(r.height / WORKSPACE_METADATA.mapHeight) * 100}%`,
                    backgroundColor:
                      activeRoom?.id === r.id ? 'rgba(16, 185, 129, 0.25)' : 'rgba(30, 41, 59, 0.7)',
                  }}
                  title={`Walk to ${r.name}`}
                />
              ))}
              {teammates.map((t) => (
                <div
                  key={t.id}
                  className="absolute w-2 h-2 rounded-full -translate-x-1 -translate-y-1 pointer-events-none"
                  style={{
                    left: `${(t.x / WORKSPACE_METADATA.mapWidth) * 100}%`,
                    top: `${(t.y / WORKSPACE_METADATA.mapHeight) * 100}%`,
                    backgroundColor: t.isCurrentUser ? '#10b981' : '#38bdf8',
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-800 shadow-lg">
          <button
            onClick={() => setZoom((z) => Math.max(0.55, Number((z - 0.12).toFixed(2))))}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="px-2 text-xs font-mono text-slate-300 tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(1.45, Number((z + 0.12).toFixed(2))))}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-slate-800 mx-0.5" />
          <button
            onClick={() => {
              setFollowAvatar(true);
              setCameraOffset({ x: 0, y: 0 });
            }}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              followAvatar ? 'bg-emerald-600/20 text-emerald-400' : 'hover:bg-slate-800 text-slate-300'
            }`}
            title="Center Camera on Your Avatar"
          >
            <Compass className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleMinimap}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              showMinimap ? 'bg-emerald-600/20 text-emerald-400' : 'hover:bg-slate-800 text-slate-300'
            }`}
            title="Toggle Minimap Radar"
          >
            <MapIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
