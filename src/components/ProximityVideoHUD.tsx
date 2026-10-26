import React, { useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  Lock,
  Unlock,
  Maximize2,
  Minimize2,
  Hand,
  Radio,
  Volume2,
} from 'lucide-react';
import { RoomZone, Teammate } from '../types/office';

interface ProximityVideoHUDProps {
  currentUser: Teammate;
  connectedTeammates: Teammate[];
  activeRoom: RoomZone | null;
  isMicOn: boolean;
  isCamOn: boolean;
  isScreenSharing: boolean;
  isBroadcasting: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleScreenShare: () => void;
  onToggleRoomLock: (roomId: string) => void;
  onWaveAtTeammate: (teammateId: string) => void;
  onOpenRoomTool?: (tool: 'whiteboard' | 'sprint-board' | 'jukebox' | 'broadcast' | 'coffee') => void;
}

export const ProximityVideoHUD: React.FC<ProximityVideoHUDProps> = ({
  currentUser,
  connectedTeammates,
  activeRoom,
  isMicOn,
  isCamOn,
  isScreenSharing,
  isBroadcasting,
  onToggleMic,
  onToggleCam,
  onToggleScreenShare,
  onToggleRoomLock,
  onWaveAtTeammate,
  onOpenRoomTool,
}) => {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const [hasRealCameraStream, setHasRealCameraStream] = useState(false);
  const [expandedScreenShare, setExpandedScreenShare] = useState(false);

  useEffect(() => {
    let activeStream: MediaStream | null = null;

    if (isCamOn && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { width: 320, height: 180 }, audio: false })
        .then((stream) => {
          activeStream = stream;
          setHasRealCameraStream(true);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        })
        .catch(() => {
          // Graceful fallback to stylized live avatar tile inside iframe
          setHasRealCameraStream(false);
        });
    } else {
      setHasRealCameraStream(false);
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isCamOn]);

  const participants = [currentUser, ...connectedTeammates];

  return (
    <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2.5 w-full max-w-5xl px-4">
      {/* Room & Proximity Connection Context Bar */}
      <div className="pointer-events-auto flex items-center justify-between gap-4 px-3.5 py-1.5 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-800 shadow-lg text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <Volume2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="font-medium text-white whitespace-nowrap">
            {isBroadcasting
              ? 'Town Hall Megaphone Broadcast Active'
              : activeRoom
              ? activeRoom.name
              : 'Proximity Audio Bubble'}
          </span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="text-slate-400 tabular-nums whitespace-nowrap">
            {participants.length} {participants.length === 1 ? 'person' : 'connected'}
          </span>
          {activeRoom?.isQuietZone && (
            <>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-violet-300 whitespace-nowrap">Sound-Isolated Pod</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeRoom && (
            <button
              onClick={() => onToggleRoomLock(activeRoom.id)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/90 hover:bg-slate-700 text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title={activeRoom.isLocked ? 'Unlock room' : 'Lock room for private meeting'}
            >
              {activeRoom.isLocked ? (
                <>
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span>Room Locked</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3 h-3 text-slate-400" />
                  <span>Lock Room</span>
                </>
              )}
            </button>
          )}

          {activeRoom?.interactiveActionType && activeRoom.interactiveObjectLabel && onOpenRoomTool && (
            <button
              onClick={() => onOpenRoomTool(activeRoom.interactiveActionType!)}
              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {activeRoom.interactiveObjectLabel}
            </button>
          )}
        </div>
      </div>

      {/* Video Tiles Strip */}
      <div className="pointer-events-auto flex items-center justify-center gap-2.5 flex-wrap">
        {participants.map((person) => {
          const isMe = Boolean(person.isCurrentUser);
          const videoEnabled = isMe ? isCamOn : person.isVideoOn;
          const micEnabled = isMe ? isMicOn : !person.isMuted;

          return (
            <div
              key={person.id}
              className={`relative group w-44 h-26 rounded-xl overflow-hidden bg-slate-900/95 border transition-all shadow-lg ${
                person.isSpeaking && micEnabled
                  ? 'border-emerald-400 ring-2 ring-emerald-500/25'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Video or Animated Spatial Avatar Portrait */}
              {isMe && videoEnabled && hasRealCameraStream ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform scale-x-[-1]"
                />
              ) : videoEnabled ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-800/80 to-slate-900 relative">
                  {/* Stylized Camera Feed Simulation */}
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center relative border border-white/15 shadow-inner"
                    style={{ backgroundColor: person.avatar.shirtColor }}
                  >
                    <div
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: person.avatar.skinColor }}
                    />
                    {person.isSpeaking && micEnabled && (
                      <span className="absolute -bottom-1 -right-1 px-1 py-0.2 bg-emerald-500 text-[9px] font-mono text-slate-950 font-semibold rounded">
                        LIVE
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-500">
                  <VideoOff className="w-5 h-5 mb-1 opacity-60" />
                  <span className="text-[11px]">Camera Off</span>
                </div>
              )}

              {/* Top Right Quick Action */}
              {!isMe && (
                <button
                  onClick={() => onWaveAtTeammate(person.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-1.5 right-1.5 p-1.5 rounded-md bg-slate-900/85 hover:bg-emerald-600 text-slate-200 hover:text-white cursor-pointer"
                  title={`Wave at ${person.name}`}
                >
                  <Hand className="w-3.5 h-3.5" />
                </button>
              )}

              {isMe && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-1.5 right-1.5 flex items-center gap-1">
                  <button
                    onClick={onToggleMic}
                    className="p-1 rounded bg-slate-900/85 hover:bg-slate-800 text-slate-200 cursor-pointer"
                    title="Toggle Microphone"
                  >
                    {micEnabled ? <Mic className="w-3 h-3 text-emerald-400" /> : <MicOff className="w-3 h-3 text-rose-400" />}
                  </button>
                  <button
                    onClick={onToggleCam}
                    className="p-1 rounded bg-slate-900/85 hover:bg-slate-800 text-slate-200 cursor-pointer"
                    title="Toggle Camera"
                  >
                    {videoEnabled ? <Video className="w-3 h-3 text-emerald-400" /> : <VideoOff className="w-3 h-3 text-rose-400" />}
                  </button>
                </div>
              )}

              {/* Bottom Scrim with Name & Audio Status */}
              <div className="absolute inset-x-0 bottom-0 px-2.5 py-1.5 bg-gradient-to-t from-black/85 via-black/50 to-transparent flex items-center justify-between gap-1.5">
                <span className="text-xs font-medium text-white truncate">
                  {person.name}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  {micEnabled ? (
                    <Mic className={`w-3.5 h-3.5 ${person.isSpeaking ? 'text-emerald-400' : 'text-slate-300'}`} />
                  ) : (
                    <MicOff className="w-3.5 h-3.5 text-rose-400" />
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Active Screen Share Tile */}
        {isScreenSharing && (
          <div
            className={`relative rounded-xl overflow-hidden bg-slate-900 border border-sky-500/60 shadow-xl transition-all ${
              expandedScreenShare ? 'w-[480px] h-[250px]' : 'w-52 h-26'
            }`}
          >
            <div className="w-full h-full p-3 flex flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-950 to-sky-950/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-sky-300 font-medium">
                  <MonitorUp className="w-3.5 h-3.5" />
                  <span className="truncate">Screen Share · Green Valley Q4 Spec</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setExpandedScreenShare(!expandedScreenShare)}
                    className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-200 cursor-pointer"
                    title={expandedScreenShare ? 'Minimize Screen Share' : 'Expand Screen Share'}
                  >
                    {expandedScreenShare ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={onToggleScreenShare}
                    className="px-1.5 py-0.5 rounded bg-rose-600/90 hover:bg-rose-500 text-[10px] font-medium text-white cursor-pointer"
                  >
                    Stop
                  </button>
                </div>
              </div>

              {/* Simulated Live Shared Window Content */}
              <div className="my-auto grid grid-cols-3 gap-2 pt-1">
                <div className="p-2 rounded bg-slate-900/90 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Active Campus Users</div>
                  <div className="text-sm font-mono font-semibold text-emerald-400 tabular-nums">8 / 12</div>
                </div>
                <div className="p-2 rounded bg-slate-900/90 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Voice Relay Latency</div>
                  <div className="text-sm font-mono font-semibold text-sky-400 tabular-nums">28 ms</div>
                </div>
                <div className="p-2 rounded bg-slate-900/90 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Sprint Velocity</div>
                  <div className="text-sm font-mono font-semibold text-amber-300 tabular-nums">94%</div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>Shared by {currentUser.name}</span>
                <span className="font-mono text-[10px] text-sky-400 tabular-nums">1080p · 60fps</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {isBroadcasting && (
        <div className="pointer-events-auto flex items-center gap-2 px-3 py-1 rounded bg-rose-950/90 border border-rose-500/40 text-rose-200 text-xs">
          <Radio className="w-3.5 h-3.5 text-rose-400" />
          <span>Your voice and screen are broadcasting across the entire Green Valley Office</span>
        </div>
      )}
    </div>
  );
};
