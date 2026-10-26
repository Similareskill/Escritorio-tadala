import React, { useState } from 'react';
import {
  ShieldAlert,
  Users,
  DoorOpen,
  Armchair,
  Radio,
  Trash2,
  Edit3,
  Navigation,
  Mic,
  MicOff,
  Video,
  VideoOff,
  RotateCcw,
  Plus,
  Search,
  Lock,
  Unlock,
  VolumeX,
  Volume2,
  Check,
  X,
  AlertTriangle,
  Move,
  UserPlus,
  Megaphone,
  LogOut,
} from 'lucide-react';
import {
  AvatarConfig,
  FurnitureCategory,
  FurnitureItem,
  RoomZone,
  Teammate,
  UserPresenceStatus,
} from '../types/office';
import { INITIAL_FURNITURE, INITIAL_ROOMS, INITIAL_TEAMMATES } from '../data/greenValleyData';
import { soundEngine } from '../utils/soundEngine';

interface AdminPanelProps {
  teammates: Teammate[];
  rooms: RoomZone[];
  furniture: FurnitureItem[];
  currentUser: Teammate;
  adminAnnouncement: string | null;
  onUpdateAnnouncement: (msg: string | null) => void;
  onUpdateTeammate: (teammateId: string, updates: Partial<Teammate>) => void;
  onRemoveTeammate: (teammateId: string) => void;
  onAddTeammate: (teammate: Teammate) => void;
  onTeleportTeammate: (teammateId: string, targetX: number, targetY: number, targetRoomId?: string | null) => void;
  onUpdateRoom: (roomId: string, updates: Partial<RoomZone>) => void;
  onSummonEveryoneToRoom: (roomId: string) => void;
  onResetEveryoneToDesks: () => void;
  onGlobalMuteToggle: (mute: boolean) => void;
  onUpdateFurniture: (furnitureId: string, updates: Partial<FurnitureItem>) => void;
  onDeleteFurniture: (furnitureId: string) => void;
  onAddFurniture: (item: FurnitureItem) => void;
  onResetFurnitureLayout: () => void;
  onLogout?: () => void;
  onClose?: () => void;
}

type AdminTab = 'members' | 'rooms' | 'furniture' | 'global';

const SKIN_COLORS = ['#ffdbac', '#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#5c3818'];
const HAIR_COLORS = ['#0f172a', '#3b2314', '#7c2d12', '#b45309', '#fde047', '#94a3b8'];
const SHIRT_COLORS = ['#10b981', '#0ea5e9', '#6366f1', '#ec4899', '#f59e0b', '#f43f5e', '#8b5cf6'];

export const AdminPanel: React.FC<AdminPanelProps> = ({
  teammates,
  rooms,
  furniture,
  currentUser,
  adminAnnouncement,
  onUpdateAnnouncement,
  onUpdateTeammate,
  onRemoveTeammate,
  onAddTeammate,
  onTeleportTeammate,
  onUpdateRoom,
  onSummonEveryoneToRoom,
  onResetEveryoneToDesks,
  onGlobalMuteToggle,
  onUpdateFurniture,
  onDeleteFurniture,
  onAddFurniture,
  onResetFurnitureLayout,
  onLogout,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('members');
  const [searchMember, setSearchMember] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [announcementInput, setAnnouncementInput] = useState(adminAnnouncement || '');

  // Editing state for a single member
  const [editingTeammate, setEditingTeammate] = useState<Teammate | null>(null);

  // Creating new member state
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Staff Engineer');
  const [newMemberDept, setNewMemberDept] = useState('Core Platform');
  const [newMemberRoom, setNewMemberRoom] = useState('courtyard-plaza');
  const [newMemberStatus, setNewMemberStatus] = useState<UserPresenceStatus>('Available');
  const [newMemberAvatar, setNewMemberAvatar] = useState<AvatarConfig>({
    skinColor: '#f1c27d',
    hairColor: '#1e293b',
    shirtColor: '#10b981',
    hairStyle: 'short',
    accessory: 'none',
  });

  // Editing state for a room
  const [editingRoom, setEditingRoom] = useState<RoomZone | null>(null);

  // Editing state for furniture item
  const [editingFurniture, setEditingFurniture] = useState<FurnitureItem | null>(null);
  const [searchFurniture, setSearchFurniture] = useState('');

  // Quick Action Feedback Toast
  const [feedback, setFeedback] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const departments = ['All', ...Array.from(new Set(teammates.map((t) => t.department)))];

  const filteredMembers = teammates.filter((t) => {
    const matchesDept = selectedDept === 'All' || t.department === selectedDept;
    const matchesQuery =
      !searchMember.trim() ||
      t.name.toLowerCase().includes(searchMember.toLowerCase()) ||
      t.role.toLowerCase().includes(searchMember.toLowerCase()) ||
      t.department.toLowerCase().includes(searchMember.toLowerCase());
    return matchesDept && matchesQuery;
  });

  const handleSaveMemberEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeammate) return;
    onUpdateTeammate(editingTeammate.id, editingTeammate);
    soundEngine.playProximityConnect();
    showFeedback(`Membro "${editingTeammate.name}" atualizado com sucesso!`);
    setEditingTeammate(null);
  };

  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    const targetRoom = rooms.find((r) => r.id === newMemberRoom) || rooms[0];
    const spawnX = targetRoom.x + Math.round(targetRoom.width / 2) + (Math.random() * 60 - 30);
    const spawnY = targetRoom.y + Math.round(targetRoom.height / 2) + (Math.random() * 60 - 30);

    const created: Teammate = {
      id: `tm-${Date.now()}`,
      name: newMemberName.trim(),
      role: newMemberRole.trim() || 'Colaborador',
      department: newMemberDept.trim() || 'Geral',
      status: newMemberStatus,
      statusMessage: 'Adicionado pelo Administrador',
      x: spawnX,
      y: spawnY,
      homeDeskX: spawnX,
      homeDeskY: spawnY,
      direction: 'down',
      isWalking: false,
      isSpeaking: false,
      isMuted: false,
      isVideoOn: true,
      currentRoomId: targetRoom.id,
      speechBubble: 'Olá time! Acabei de ingressar.',
      speechTimestamp: Date.now(),
      avatar: newMemberAvatar,
    };

    onAddTeammate(created);
    soundEngine.playRoomEnter();
    showFeedback(`Membro "${created.name}" adicionado à ${targetRoom.name}!`);
    setNewMemberName('');
    setIsAddingMember(false);
  };

  const handleTeleportToRoom = (teammateId: string, roomId: string) => {
    const targetRoom = rooms.find((r) => r.id === roomId);
    if (!targetRoom) return;
    const destX = targetRoom.x + Math.round(targetRoom.width / 2);
    const destY = targetRoom.y + Math.round(targetRoom.height / 2);
    onTeleportTeammate(teammateId, destX, destY, targetRoom.id);
    soundEngine.playProximityConnect();
    showFeedback(`Membro teleportado para ${targetRoom.name}`);
  };

  const handleSaveRoomEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;
    onUpdateRoom(editingRoom.id, editingRoom);
    soundEngine.playProximityConnect();
    showFeedback(`Configurações da sala "${editingRoom.name}" atualizadas!`);
    setEditingRoom(null);
  };

  const handleSaveFurnitureEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFurniture) return;
    onUpdateFurniture(editingFurniture.id, editingFurniture);
    soundEngine.playProximityConnect();
    showFeedback(`Móvel "${editingFurniture.label}" atualizado!`);
    setEditingFurniture(null);
  };

  const handleBroadcastAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateAnnouncement(announcementInput.trim() || null);
    soundEngine.playWaveOrKnock();
    showFeedback(
      announcementInput.trim()
        ? 'Alerta administrativo transmitido para todo o escritório!'
        : 'Alerta administrativo removido.'
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden text-slate-100">
      {/* Top Header of Admin Panel */}
      <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white font-display flex items-center gap-2">
              Painel de Gestão do Administrador
              <span className="text-[11px] font-mono font-normal text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
                Acesso Total
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Controle total do campus Green Valley: editar membros, mover avatares, gerenciar salas, objetos e moderação global.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 hover:text-red-200 text-xs font-medium transition-colors cursor-pointer"
              title="Encerrar sessão administrativa"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair do Admin</span>
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Fechar Painel Admin e voltar ao mapa"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Feedback Toast */}
      {feedback && (
        <div className="bg-emerald-950/80 border-b border-emerald-500/40 text-emerald-300 text-xs px-6 py-2 flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 px-6 py-2.5 bg-slate-950 border-b border-slate-800 shrink-0 overflow-x-auto">
        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'members'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Gestão de Membros ({teammates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('rooms')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'rooms'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <DoorOpen className="w-3.5 h-3.5" />
          <span>Salas e Zonas ({rooms.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('furniture')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'furniture'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Armchair className="w-3.5 h-3.5" />
          <span>Móveis & Objetos ({furniture.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('global')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'global'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Controle Global & Moderação</span>
        </button>
      </div>

      {/* TAB CONTENT VIEWPORT */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* ============================================================ */}
        {/* TAB 1: MEMBERS MANAGEMENT */}
        {/* ============================================================ */}
        {activeTab === 'members' && (
          <div className="space-y-4 max-w-6xl mx-auto">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchMember}
                    onChange={(e) => setSearchMember(e.target.value)}
                    placeholder="Pesquisar membro por nome, cargo ou squad..."
                    className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
                  {departments.map((dept) => (
                    <button
                      key={dept}
                      onClick={() => setSelectedDept(dept)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                        selectedDept === dept ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setIsAddingMember(!isAddingMember)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap"
              >
                <UserPlus className="w-4 h-4" />
                <span>Adicionar Novo Membro</span>
              </button>
            </div>

            {/* Form to Add New Member */}
            {isAddingMember && (
              <form
                onSubmit={handleCreateMember}
                className="p-5 rounded-xl bg-slate-900 border border-emerald-500/40 shadow-xl space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-emerald-400" />
                    <span>Adicionar Novo Colaborador ao Office Map</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsAddingMember(false)}
                    className="text-slate-400 hover:text-white text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Nome Completo</label>
                    <input
                      type="text"
                      required
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      placeholder="Ex: Carlos Drummond"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Cargo / Role</label>
                    <input
                      type="text"
                      required
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value)}
                      placeholder="Ex: Senior Fullstack Engineer"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Departamento</label>
                    <input
                      type="text"
                      required
                      value={newMemberDept}
                      onChange={(e) => setNewMemberDept(e.target.value)}
                      placeholder="Ex: Core Platform"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Sala Inicial</label>
                    <select
                      value={newMemberRoom}
                      onChange={(e) => setNewMemberRoom(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                    >
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Avatar Colors */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Cor da Roupa</label>
                    <div className="flex items-center gap-1.5">
                      {SHIRT_COLORS.map((c) => (
                        <button
                          type="button"
                          key={c}
                          onClick={() => setNewMemberAvatar({ ...newMemberAvatar, shirtColor: c })}
                          className={`w-5 h-5 rounded-full border cursor-pointer ${
                            newMemberAvatar.shirtColor === c ? 'border-white scale-110' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">Tom de Pele</label>
                    <div className="flex items-center gap-1.5">
                      {SKIN_COLORS.map((c) => (
                        <button
                          type="button"
                          key={c}
                          onClick={() => setNewMemberAvatar({ ...newMemberAvatar, skinColor: c })}
                          className={`w-5 h-5 rounded-full border cursor-pointer ${
                            newMemberAvatar.skinColor === c ? 'border-white scale-110' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Acessório</label>
                    <select
                      value={newMemberAvatar.accessory}
                      onChange={(e) =>
                        setNewMemberAvatar({
                          ...newMemberAvatar,
                          accessory: e.target.value as AvatarConfig['accessory'],
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                    >
                      <option value="none">Nenhum</option>
                      <option value="headset">Headset Gamer</option>
                      <option value="glasses">Óculos Studio</option>
                      <option value="beanie">Gorro</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddingMember(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white cursor-pointer"
                  >
                    Adicionar ao Mapa Agora
                  </button>
                </div>
              </form>
            )}

            {/* Members Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-400 bg-slate-950/70">
                    <th className="py-3 px-4 font-medium">Avatar & Nome</th>
                    <th className="py-3 px-4 font-medium">Cargo / Squad</th>
                    <th className="py-3 px-4 font-medium">Localização Atual</th>
                    <th className="py-3 px-4 font-medium">Mídia / Status</th>
                    <th className="py-3 px-4 font-medium text-right">Ações de Gestão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {filteredMembers.map((person) => {
                    const currentRoom = rooms.find((r) => r.id === person.currentRoomId);
                    return (
                      <tr key={person.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-white/20 shadow-xs"
                              style={{ backgroundColor: person.avatar.shirtColor }}
                            >
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: person.avatar.skinColor }}
                              />
                            </div>
                            <div>
                              <div className="font-semibold text-white flex items-center gap-1.5">
                                <span>{person.name}</span>
                                {person.isCurrentUser && (
                                  <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono">
                                    VOCÊ (ADMIN)
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {person.status} · {person.statusMessage}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-slate-300">
                          <div>{person.role}</div>
                          <div className="text-[11px] text-slate-400">{person.department}</div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="text-slate-200">
                            {currentRoom ? currentRoom.name : 'Área Externa'}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 tabular-nums">
                            X: {Math.round(person.x)} | Y: {Math.round(person.y)}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                onUpdateTeammate(person.id, { isMuted: !person.isMuted });
                                showFeedback(`Microfone de ${person.name} ${person.isMuted ? 'ativado' : 'silenciado'}`);
                              }}
                              className={`p-1.5 rounded cursor-pointer ${
                                person.isMuted
                                  ? 'bg-rose-950/60 text-rose-300 hover:bg-rose-900'
                                  : 'bg-slate-800 text-emerald-400 hover:bg-slate-700'
                              }`}
                              title={person.isMuted ? 'Ativar Áudio do Membro' : 'Forçar Mudo'}
                            >
                              {person.isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                            </button>

                            <button
                              onClick={() => {
                                onUpdateTeammate(person.id, { isVideoOn: !person.isVideoOn });
                                showFeedback(`Câmera de ${person.name} ${person.isVideoOn ? 'desligada' : 'ligada'}`);
                              }}
                              className={`p-1.5 rounded cursor-pointer ${
                                person.isVideoOn
                                  ? 'bg-slate-800 text-emerald-400 hover:bg-slate-700'
                                  : 'bg-rose-950/60 text-rose-300 hover:bg-rose-900'
                              }`}
                              title={person.isVideoOn ? 'Desligar Câmera' : 'Ligar Câmera'}
                            >
                              {person.isVideoOn ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
                            </button>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {/* Teleport Dropdown */}
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleTeleportToRoom(person.id, e.target.value);
                                  e.target.value = '';
                                }
                              }}
                              defaultValue=""
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 cursor-pointer"
                              title="Teleportar para sala..."
                            >
                              <option value="" disabled>
                                Teleportar...
                              </option>
                              {rooms.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.name}
                                </option>
                              ))}
                            </select>

                            {/* Edit Button */}
                            <button
                              onClick={() => setEditingTeammate(person)}
                              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                              title="Editar Dados do Membro"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete / Kick Button */}
                            {!person.isCurrentUser ? (
                              <button
                                onClick={() => {
                                  if (confirm(`Remover "${person.name}" do Office Map?`)) {
                                    onRemoveTeammate(person.id);
                                    soundEngine.playWaveOrKnock();
                                    showFeedback(`Membro "${person.name}" removido do campus!`);
                                  }
                                }}
                                className="p-1.5 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 cursor-pointer"
                                title="Remover Membro do Mapa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Modal: Edit Specific Member */}
            {editingTeammate && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-6">
                <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                    <h2 className="text-base font-semibold text-white flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-emerald-400" />
                      <span>Editar Membro · {editingTeammate.name}</span>
                    </h2>
                    <button
                      onClick={() => setEditingTeammate(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveMemberEdit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Nome Completo</label>
                        <input
                          type="text"
                          required
                          value={editingTeammate.name}
                          onChange={(e) => setEditingTeammate({ ...editingTeammate, name: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Cargo / Role</label>
                        <input
                          type="text"
                          required
                          value={editingTeammate.role}
                          onChange={(e) => setEditingTeammate({ ...editingTeammate, role: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Departamento</label>
                        <input
                          type="text"
                          required
                          value={editingTeammate.department}
                          onChange={(e) => setEditingTeammate({ ...editingTeammate, department: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Status de Presença</label>
                        <select
                          value={editingTeammate.status}
                          onChange={(e) =>
                            setEditingTeammate({
                              ...editingTeammate,
                              status: e.target.value as UserPresenceStatus,
                            })
                          }
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                        >
                          <option value="Available">Available</option>
                          <option value="Deep Focus">Deep Focus</option>
                          <option value="In a Meeting">In a Meeting</option>
                          <option value="Stepping Out">Stepping Out</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Mensagem de Status</label>
                      <input
                        type="text"
                        value={editingTeammate.statusMessage}
                        onChange={(e) => setEditingTeammate({ ...editingTeammate, statusMessage: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Coordinates */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Posição X no Mapa</label>
                        <input
                          type="number"
                          value={Math.round(editingTeammate.x)}
                          onChange={(e) =>
                            setEditingTeammate({ ...editingTeammate, x: Number(e.target.value) })
                          }
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Posição Y no Mapa</label>
                        <input
                          type="number"
                          value={Math.round(editingTeammate.y)}
                          onChange={(e) =>
                            setEditingTeammate({ ...editingTeammate, y: Number(e.target.value) })
                          }
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white"
                        />
                      </div>
                    </div>

                    {/* Outfit Color */}
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Cor da Roupa do Avatar</label>
                      <div className="flex items-center gap-2">
                        {SHIRT_COLORS.map((c) => (
                          <button
                            type="button"
                            key={c}
                            onClick={() =>
                              setEditingTeammate({
                                ...editingTeammate,
                                avatar: { ...editingTeammate.avatar, shirtColor: c },
                              })
                            }
                            className={`w-6 h-6 rounded-full border cursor-pointer ${
                              editingTeammate.avatar.shirtColor === c ? 'border-white scale-110' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                      {!editingTeammate.isCurrentUser ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Remover "${editingTeammate.name}" do mapa?`)) {
                              onRemoveTeammate(editingTeammate.id);
                              setEditingTeammate(null);
                              showFeedback(`Membro removido.`);
                            }
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-xs cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remover Membro</span>
                        </button>
                      ) : <div />}

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingTeammate(null)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white cursor-pointer"
                        >
                          Salvar Alterações
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: ROOMS & ACOUSTICS MANAGEMENT */}
        {/* ============================================================ */}
        {activeTab === 'rooms' && (
          <div className="space-y-4 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">Configuração de Salas e Zonas Acústicas</h2>
                <p className="text-xs text-slate-400">
                  Bloqueie acessos, altere capacidades, configure isolamento acústico ou convoque todos os membros.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rooms.map((room) => {
                const occupants = teammates.filter((t) => t.currentRoomId === room.id);
                return (
                  <div
                    key={room.id}
                    className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <span>{room.name}</span>
                          {room.isLocked && (
                            <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.2 rounded">
                              TRANCADA
                            </span>
                          )}
                        </h3>
                        <span className="text-xs font-mono text-emerald-400 tabular-nums">
                          {occupants.length} / {room.capacity} membros
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                        <span>Categoria: {room.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>{room.isQuietZone ? 'Isolamento Acústico' : 'Som Aberto'}</span>
                      </div>

                      <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                        {room.description}
                      </p>

                      {occupants.length > 0 && (
                        <div className="mt-2 text-xs text-slate-400">
                          Ocupantes: <span className="text-slate-200">{occupants.map((o) => o.name).join(', ')}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        {/* Lock / Unlock */}
                        <button
                          onClick={() => {
                            onUpdateRoom(room.id, { isLocked: !room.isLocked });
                            soundEngine.playWaveOrKnock();
                            showFeedback(`Sala "${room.name}" ${!room.isLocked ? 'trancada' : 'destrancada'}`);
                          }}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                            room.isLocked
                              ? 'bg-amber-950/60 text-amber-300 border border-amber-500/40 hover:bg-amber-900'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                          }`}
                        >
                          {room.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                          <span>{room.isLocked ? 'Destrancar' : 'Trancar Sala'}</span>
                        </button>

                        {/* Quiet Zone Toggle */}
                        <button
                          onClick={() => {
                            onUpdateRoom(room.id, { isQuietZone: !room.isQuietZone });
                            showFeedback(`Modo silêncio da sala "${room.name}" alterado.`);
                          }}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                            room.isQuietZone
                              ? 'bg-violet-950/60 text-violet-300 border border-violet-500/40'
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          }`}
                          title="Alternar isolamento acústico"
                        >
                          {room.isQuietZone ? 'Silenciosa Ativada' : 'Tornar Silenciosa'}
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Summon Everyone Here */}
                        <button
                          onClick={() => {
                            if (confirm(`Teleportar todos os ${teammates.length} membros para "${room.name}"?`)) {
                              onSummonEveryoneToRoom(room.id);
                              soundEngine.playProximityConnect();
                              showFeedback(`Todos os membros foram convocados para ${room.name}!`);
                            }
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors cursor-pointer"
                          title="Convoque todos os membros do campus para esta sala"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Reunir Todos Aqui</span>
                        </button>

                        <button
                          onClick={() => setEditingRoom(room)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                          title="Editar Capacidade e Detalhes da Sala"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal: Edit Room */}
            {editingRoom && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-6">
                <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                    <h2 className="text-base font-semibold text-white">Editar Sala · {editingRoom.name}</h2>
                    <button
                      onClick={() => setEditingRoom(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveRoomEdit} className="p-6 space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Nome da Sala</label>
                      <input
                        type="text"
                        required
                        value={editingRoom.name}
                        onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Capacidade Máxima</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={editingRoom.capacity}
                          onChange={(e) => setEditingRoom({ ...editingRoom, capacity: Number(e.target.value) })}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Categoria</label>
                        <select
                          value={editingRoom.category}
                          onChange={(e) =>
                            setEditingRoom({
                              ...editingRoom,
                              category: e.target.value as RoomZone['category'],
                            })
                          }
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                        >
                          <option value="Collaborative">Collaborative</option>
                          <option value="Meeting">Meeting</option>
                          <option value="Focus">Focus</option>
                          <option value="Social">Social</option>
                          <option value="Outdoor">Outdoor</option>
                          <option value="Stage">Stage</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Descrição</label>
                      <textarea
                        rows={2}
                        value={editingRoom.description}
                        onChange={(e) => setEditingRoom({ ...editingRoom, description: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setEditingRoom(null)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white cursor-pointer"
                      >
                        Salvar Sala
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: FURNITURE & OBJECTS MANAGEMENT */}
        {/* ============================================================ */}
        {activeTab === 'furniture' && (
          <div className="space-y-4 max-w-6xl mx-auto">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="relative flex-1 min-w-[280px]">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchFurniture}
                  onChange={(e) => setSearchFurniture(e.target.value)}
                  placeholder="Pesquisar móvel ou objeto interativo no mapa..."
                  className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                onClick={() => {
                  if (confirm('Restaurar o mobiliário padrão de Green Valley? Todos os itens customizados serão redefinidos.')) {
                    onResetFurnitureLayout();
                    soundEngine.playRoomEnter();
                    showFeedback('Layout de móveis padrão restaurado!');
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Restaurar Móveis Padrão</span>
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-400 bg-slate-950/70">
                    <th className="py-3 px-4 font-medium">Objeto / Rótulo</th>
                    <th className="py-3 px-4 font-medium">Tipo</th>
                    <th className="py-3 px-4 font-medium">Sala Associada</th>
                    <th className="py-3 px-4 font-medium">Proprietário / Claim</th>
                    <th className="py-3 px-4 font-medium text-right">Coordenadas</th>
                    <th className="py-3 px-4 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {furniture
                    .filter(
                      (f) =>
                        !searchFurniture.trim() ||
                        f.label.toLowerCase().includes(searchFurniture.toLowerCase()) ||
                        f.type.toLowerCase().includes(searchFurniture.toLowerCase())
                    )
                    .map((item) => {
                      const roomObj = rooms.find((r) => r.id === item.roomId);
                      return (
                        <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-medium text-white">{item.label}</td>
                          <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{item.type}</td>
                          <td className="py-3 px-4 text-slate-300">{roomObj ? roomObj.name : 'Área Externa'}</td>
                          <td className="py-3 px-4 text-slate-400">{item.claimedBy || 'Livre'}</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-400 tabular-nums">
                            {item.x}, {item.y} ({item.width}x{item.height})
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => setEditingFurniture(item)}
                                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                                title="Editar Posição ou Nome do Móvel"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Remover "${item.label}" do mapa?`)) {
                                    onDeleteFurniture(item.id);
                                    showFeedback(`Móvel "${item.label}" removido.`);
                                  }
                                }}
                                className="p-1.5 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 cursor-pointer"
                                title="Excluir Móvel"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Modal: Edit Furniture */}
            {editingFurniture && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-6">
                <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                    <h2 className="text-base font-semibold text-white">Editar Móvel · {editingFurniture.label}</h2>
                    <button
                      onClick={() => setEditingFurniture(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveFurnitureEdit} className="p-6 space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Rótulo / Descrição</label>
                      <input
                        type="text"
                        required
                        value={editingFurniture.label}
                        onChange={(e) => setEditingFurniture({ ...editingFurniture, label: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Coordenada X</label>
                        <input
                          type="number"
                          value={editingFurniture.x}
                          onChange={(e) => setEditingFurniture({ ...editingFurniture, x: Number(e.target.value) })}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Coordenada Y</label>
                        <input
                          type="number"
                          value={editingFurniture.y}
                          onChange={(e) => setEditingFurniture({ ...editingFurniture, y: Number(e.target.value) })}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Reivindicado por (Mesa Pessoal)</label>
                      <input
                        type="text"
                        value={editingFurniture.claimedBy || ''}
                        onChange={(e) => setEditingFurniture({ ...editingFurniture, claimedBy: e.target.value || undefined })}
                        placeholder="Ex: Lucas Mendes (ou deixe vazio para livre)"
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setEditingFurniture(null)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white cursor-pointer"
                      >
                        Salvar Móvel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: GLOBAL COMMANDS & MODERATION */}
        {/* ============================================================ */}
        {activeTab === 'global' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Global Admin Broadcast Announcement */}
            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-emerald-400" />
                <h2 className="text-sm font-semibold text-white">
                  Transmitir Alerta / Comunicado Administrativo
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                O comunicado será fixado em destaque na interface de todos os membros do Green Valley Office.
              </p>

              <form onSubmit={handleBroadcastAnnouncement} className="space-y-3">
                <textarea
                  rows={2}
                  value={announcementInput}
                  onChange={(e) => setAnnouncementInput(e.target.value)}
                  placeholder="Ex: Reunião geral de emergência no Anfiteatro às 15:00. Todos convocados!"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <div className="flex items-center justify-between">
                  {adminAnnouncement ? (
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateAnnouncement(null);
                        setAnnouncementInput('');
                        showFeedback('Comunicado removido.');
                      }}
                      className="text-xs text-rose-400 hover:text-rose-300 cursor-pointer"
                    >
                      Remover Comunicado Ativo
                    </button>
                  ) : <div />}

                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors cursor-pointer"
                  >
                    Publicar Transmissão
                  </button>
                </div>
              </form>
            </div>

            {/* Quick Global Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Navigation className="w-4 h-4 text-emerald-400" />
                  <span>Reunião Geral no Anfiteatro</span>
                </div>
                <p className="text-xs text-slate-400">
                  Teleporta instantaneamente todos os {teammates.length} membros do campus para os assentos do anfiteatro.
                </p>
                <button
                  onClick={() => {
                    if (confirm('Confeccionar reunião geral no Anfiteatro para todos?')) {
                      onSummonEveryoneToRoom('town-hall-stage');
                      soundEngine.playProximityConnect();
                      showFeedback('Todos os membros convocados para o Anfiteatro!');
                    }
                  }}
                  className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white cursor-pointer transition-colors"
                >
                  Confeccionar All-Hands Assembly
                </button>
              </div>

              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <RotateCcw className="w-4 h-4 text-sky-400" />
                  <span>Retornar Todos às Suas Mesas</span>
                </div>
                <p className="text-xs text-slate-400">
                  Envia todos os membros de volta às suas mesas e postos de trabalho designados no Coworking Studio e War Room.
                </p>
                <button
                  onClick={() => {
                    onResetEveryoneToDesks();
                    soundEngine.playFootstep();
                    showFeedback('Todos os membros retornaram às suas mesas!');
                  }}
                  className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white cursor-pointer transition-colors"
                >
                  Retornar Todos aos Desks
                </button>
              </div>

              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <VolumeX className="w-4 h-4 text-rose-400" />
                  <span>Silenciar Todos os Membros (Mute Global)</span>
                </div>
                <p className="text-xs text-slate-400">
                  Desativa o microfone de todos os membros no campus para apresentações ou eventos ao vivo.
                </p>
                <button
                  onClick={() => {
                    onGlobalMuteToggle(true);
                    showFeedback('Todos os membros foram silenciados.');
                  }}
                  className="w-full py-2 rounded-lg bg-rose-950/70 border border-rose-500/40 hover:bg-rose-900 text-xs font-semibold text-rose-200 cursor-pointer transition-colors"
                >
                  Silenciar Todos (Global Mute)
                </button>
              </div>

              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <span>Restaurar Microfones (Unmute Geral)</span>
                </div>
                <p className="text-xs text-slate-400">
                  Restaura o estado do microfone para todos os membros no escritório.
                </p>
                <button
                  onClick={() => {
                    onGlobalMuteToggle(false);
                    showFeedback('Microfones restaurados.');
                  }}
                  className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer transition-colors"
                >
                  Restaurar Microfones
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
