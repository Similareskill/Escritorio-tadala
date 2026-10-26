import React, { useEffect, useRef, useState } from 'react';
import { X, Eraser, Trash2, Download, StickyNote as StickyIcon, PenTool, Plus } from 'lucide-react';
import { StickyNote } from '../types/office';

interface WhiteboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  stickyNotes: StickyNote[];
  onAddStickyNote: (text: string, color: string) => void;
  onDeleteStickyNote: (id: string) => void;
}

const STROKE_COLORS = ['#10b981', '#38bdf8', '#f59e0b', '#f43f5e', '#a855f7', '#f8fafc'];
const STICKY_COLORS = [
  { name: 'Canary', hex: '#fef08a' },
  { name: 'Mint', hex: '#a7f3d0' },
  { name: 'Sky', hex: '#bfdbfe' },
  { name: 'Rose', hex: '#fecdd3' },
];

export const WhiteboardModal: React.FC<WhiteboardModalProps> = ({
  isOpen,
  onClose,
  stickyNotes,
  onAddStickyNote,
  onDeleteStickyNote,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#10b981');
  const [brushSize, setBrushSize] = useState(3);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteColor, setNewNoteColor] = useState(STICKY_COLORS[0].hex);

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw initial architecture diagram on Evergreen Boardroom Whiteboard
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle dot grid
    ctx.fillStyle = 'rgba(148, 163, 184, 0.14)';
    for (let x = 24; x < canvas.width; x += 24) {
      for (let y = 24; y < canvas.height; y += 24) {
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }

    // Pre-drawn team diagram
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.strokeRect(70, 210, 180, 74);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Green Valley Client', 95, 245);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillText('60fps Spatial Canvas', 95, 265);

    // Arrow
    ctx.beginPath();
    ctx.moveTo(250, 247);
    ctx.lineTo(340, 247);
    ctx.strokeStyle = '#38bdf8';
    ctx.stroke();

    ctx.strokeRect(340, 210, 200, 74);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Proximity Audio Mesh', 362, 245);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillText('Radius <= 210px', 362, 265);
  }, [isOpen]);

  if (!isOpen) return null;

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = tool === 'eraser' ? '#0f172a' : strokeColor;
    ctx.lineWidth = tool === 'eraser' ? 22 : brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(148, 163, 184, 0.14)';
    for (let x = 24; x < canvas.width; x += 24) {
      for (let y = 24; y < canvas.height; y += 24) {
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'green-valley-boardroom-whiteboard.png';
    link.href = dataUrl;
    link.click();
  };

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    onAddStickyNote(newNoteText.trim(), newNoteColor);
    setNewNoteText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-6">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Evergreen Boardroom · Collaborative Whiteboard
            </h2>
            <p className="text-xs text-slate-400">
              Shared in real time with teammates inside the Evergreen Boardroom · Lucas Mendes, Clara Silva
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PNG</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close Whiteboard"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 px-6 py-3 bg-slate-950/60 border-b border-slate-800 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTool('pen')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                tool === 'pen' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Marker</span>
            </button>
            <button
              onClick={() => setTool('eraser')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                tool === 'eraser' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Eraser</span>
            </button>

            <div className="h-4 w-px bg-slate-800 mx-1" />

            {STROKE_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setTool('pen');
                  setStrokeColor(c);
                }}
                className={`w-6 h-6 rounded-full border transition-transform cursor-pointer ${
                  strokeColor === c && tool === 'pen' ? 'scale-115 border-white' : 'border-slate-700'
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Select color ${c}`}
              />
            ))}

            <div className="h-4 w-px bg-slate-800 mx-1" />

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Stroke</span>
              {[2, 4, 7].map((sz) => (
                <button
                  key={sz}
                  onClick={() => setBrushSize(sz)}
                  className={`px-2 py-1 rounded font-mono text-xs cursor-pointer ${
                    brushSize === sz ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {sz}px
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-rose-950/80 hover:text-rose-300 text-xs text-slate-300 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Canvas</span>
          </button>
        </div>

        {/* Main Workspace: Drawing Canvas + Sticky Notes Column */}
        <div className="grid grid-cols-1 lg:grid-cols-3 flex-1 overflow-hidden">
          <div className="lg:col-span-2 relative bg-slate-950 flex items-center justify-center overflow-hidden p-4">
            <canvas
              ref={canvasRef}
              width={760}
              height={420}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className="w-full h-full max-h-[420px] rounded-lg border border-slate-800 cursor-crosshair shadow-inner"
            />
          </div>

          {/* Sticky Notes Panel */}
          <div className="border-t lg:border-t-0 lg:border-l border-slate-800 p-5 flex flex-col justify-between bg-slate-900/60 overflow-y-auto">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <StickyIcon className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">Boardroom Sticky Notes</h3>
              </div>

              <div className="space-y-2.5 mb-5">
                {stickyNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 rounded-lg text-slate-900 shadow-sm relative group"
                    style={{ backgroundColor: note.color }}
                  >
                    <button
                      onClick={() => onDeleteStickyNote(note.id)}
                      className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 p-1 rounded hover:bg-black/10 text-slate-700 cursor-pointer"
                      title="Remove note"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <p className="text-xs font-medium leading-relaxed pr-5">{note.text}</p>
                    <div className="mt-2 text-[11px] text-slate-700">
                      Posted by {note.author}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateNote} className="space-y-3 pt-3 border-t border-slate-800">
              <label className="block text-xs font-medium text-slate-300">
                Pin a New Sticky Note
              </label>
              <textarea
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                rows={2}
                placeholder="Write a milestone, action item, or design idea..."
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {STICKY_COLORS.map((sc) => (
                    <button
                      type="button"
                      key={sc.hex}
                      onClick={() => setNewNoteColor(sc.hex)}
                      className={`w-5 h-5 rounded-full border cursor-pointer ${
                        newNoteColor === sc.hex ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: sc.hex }}
                      title={sc.name}
                    />
                  ))}
                </div>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Pin Note</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
