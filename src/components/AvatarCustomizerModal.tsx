import React, { useState } from 'react';
import { X, Check, Copy, UserPlus, Sparkles } from 'lucide-react';
import { AvatarConfig, Teammate, UserPresenceStatus } from '../types/office';
import { WORKSPACE_METADATA } from '../data/greenValleyData';

interface AvatarCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Teammate;
  onUpdateProfile: (
    name: string,
    role: string,
    status: UserPresenceStatus,
    statusMessage: string,
    avatar: AvatarConfig
  ) => void;
}

const SKIN_TONES = ['#ffdbac', '#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#5c3818'];
const HAIR_COLORS = ['#0f172a', '#3b2314', '#7c2d12', '#b45309', '#fde047', '#94a3b8'];
const SHIRT_COLORS = ['#10b981', '#0ea5e9', '#6366f1', '#ec4899', '#f59e0b', '#f43f5e', '#8b5cf6'];

export const AvatarCustomizerModal: React.FC<AvatarCustomizerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateProfile,
}) => {
  const [name, setName] = useState(currentUser.name);
  const [role, setRole] = useState(currentUser.role);
  const [status, setStatus] = useState<UserPresenceStatus>(currentUser.status);
  const [statusMessage, setStatusMessage] = useState(currentUser.statusMessage);
  const [avatar, setAvatar] = useState<AvatarConfig>(currentUser.avatar);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(
      name.trim() || 'Leandro (You)',
      role.trim() || 'Product Architect',
      status,
      statusMessage.trim() || 'Working in Green Valley Office',
      avatar
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-6">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-white">Customize Your Spatial Avatar</h2>
            <p className="text-xs text-slate-400">
              Update your appearance and presence inside Green Valley Office
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          {/* Avatar Live Preview */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="w-16 h-16 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center relative">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center relative shadow-md"
                style={{ backgroundColor: avatar.shirtColor }}
              >
                <div
                  className="w-6 h-6 rounded-full relative"
                  style={{ backgroundColor: avatar.skinColor }}
                >
                  <div
                    className="absolute -top-1 inset-x-0 h-2.5 rounded-t-full"
                    style={{ backgroundColor: avatar.hairColor }}
                  />
                </div>
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-white">{name || 'Leandro (You)'}</div>
              <div className="text-xs text-slate-400">
                {role} · {status}
              </div>
              <div className="text-xs text-emerald-400 mt-0.5">{statusMessage}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Role / Squad</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Presence Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as UserPresenceStatus)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Available">Available</option>
                <option value="Deep Focus">Deep Focus</option>
                <option value="In a Meeting">In a Meeting</option>
                <option value="Stepping Out">Stepping Out</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Status Note</label>
              <input
                type="text"
                value={statusMessage}
                onChange={(e) => setStatusMessage(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Colors & Accessories */}
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Outfit Color</label>
              <div className="flex items-center gap-2">
                {SHIRT_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setAvatar({ ...avatar, shirtColor: c })}
                    className={`w-6 h-6 rounded-full border cursor-pointer ${
                      avatar.shirtColor === c ? 'border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Skin Tone</label>
                <div className="flex items-center gap-1.5">
                  {SKIN_TONES.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setAvatar({ ...avatar, skinColor: c })}
                      className={`w-5 h-5 rounded-full border cursor-pointer ${
                        avatar.skinColor === c ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Hair Tone</label>
                <div className="flex items-center gap-1.5">
                  {HAIR_COLORS.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setAvatar({ ...avatar, hairColor: c })}
                      className={`w-5 h-5 rounded-full border cursor-pointer ${
                        avatar.hairColor === c ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Hair Style</label>
                <select
                  value={avatar.hairStyle}
                  onChange={(e) =>
                    setAvatar({ ...avatar, hairStyle: e.target.value as AvatarConfig['hairStyle'] })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                >
                  <option value="short">Short Crop</option>
                  <option value="curly">Curly Crown</option>
                  <option value="bun">Top Bun</option>
                  <option value="parted">Side Part</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Accessory</label>
                <select
                  value={avatar.accessory}
                  onChange={(e) =>
                    setAvatar({ ...avatar, accessory: e.target.value as AvatarConfig['accessory'] })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                >
                  <option value="none">None</option>
                  <option value="headset">Wireless Headset</option>
                  <option value="glasses">Studio Frames</option>
                  <option value="beanie">Knit Beanie</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white cursor-pointer"
            >
              Save Avatar Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSpawnGuestTeammate: (name: string, role: string, destinationRoomId: string) => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({
  isOpen,
  onClose,
  onSpawnGuestTeammate,
}) => {
  const [copied, setCopied] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestRole, setGuestRole] = useState('Visiting Product Partner');
  const [targetRoom, setTargetRoom] = useState('courtyard-plaza');

  if (!isOpen) return null;

  const inviteUrl = `https://app.sowork.com/s/${WORKSPACE_METADATA.workspaceId}/${WORKSPACE_METADATA.slug}?user=${WORKSPACE_METADATA.defaultUserToken}`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(inviteUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpawn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    onSpawnGuestTeammate(guestName.trim(), guestRole.trim() || 'Guest Collaborator', targetRoom);
    setGuestName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-6">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-white">Invite to Green Valley Office</h2>
            <p className="text-xs text-slate-400">
              Workspace ID: {WORKSPACE_METADATA.workspaceId} · {WORKSPACE_METADATA.slug}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Direct Campus Invite Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={inviteUrl}
                className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white transition-colors cursor-pointer shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Teste a sincronização abrindo outro dispositivo ou aba:
              </span>
              <button
                type="button"
                onClick={() => {
                  const colleagueUrl = `${window.location.origin}${window.location.pathname}?user=colega_${Math.random().toString(36).substring(2, 6)}`;
                  window.open(colleagueUrl, '_blank');
                }}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 underline font-medium cursor-pointer"
              >
                Abrir 2º Dispositivo em Nova Aba ↗
              </button>
            </div>
          </div>

          <form onSubmit={handleSpawn} className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <UserPlus className="w-4 h-4 text-emerald-400" />
              <span>Simulate Teammate Joining Live Now</span>
            </div>
            <p className="text-xs text-slate-400">
              Spawn an interactive teammate or guest avatar directly into Green Valley Office to test proximity audio and room capacity.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Teammate Name</label>
                <input
                  type="text"
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="e.g. Mateo Alvarez"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Role</label>
                <input
                  type="text"
                  value={guestRole}
                  onChange={(e) => setGuestRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">Arrival Zone</label>
              <select
                value={targetRoom}
                onChange={(e) => setTargetRoom(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value="courtyard-plaza">Central Valley Courtyard</option>
                <option value="coworking-studio">Main Coworking Studio</option>
                <option value="evergreen-boardroom">Evergreen Boardroom</option>
                <option value="engineering-war-room">Engineering War Room</option>
                <option value="valley-cafe">Valley Café & Lounge</option>
                <option value="town-hall-stage">Town Hall Amphitheater</option>
              </select>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-100 hover:bg-white text-slate-900 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Add Teammate to Map</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
