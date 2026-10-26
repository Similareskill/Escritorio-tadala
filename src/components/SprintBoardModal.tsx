import React, { useState } from 'react';
import { X, Plus, ArrowRight, CheckCircle2 } from 'lucide-react';
import { SprintTask } from '../types/office';

interface SprintBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: SprintTask[];
  onMoveTask: (taskId: string, nextStatus: SprintTask['status']) => void;
  onAddTask: (title: string, assignee: string, estimate: string) => void;
}

const COLUMNS: SprintTask['status'][] = ['Backlog', 'In Progress', 'Review', 'Done'];

export const SprintBoardModal: React.FC<SprintBoardModalProps> = ({
  isOpen,
  onClose,
  tasks,
  onMoveTask,
  onAddTask,
}) => {
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('Leandro (You)');
  const [estimate, setEstimate] = useState('5 pts');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddTask(title.trim(), assignee, estimate);
    setTitle('');
  };

  const getNextStatus = (current: SprintTask['status']): SprintTask['status'] | null => {
    const idx = COLUMNS.indexOf(current);
    if (idx === -1 || idx === COLUMNS.length - 1) return null;
    return COLUMNS[idx + 1];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-6">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Engineering War Room · Sprint 42 Kanban Wall
            </h2>
            <p className="text-xs text-slate-400">
              Green Valley Campus Infrastructure & Spatial Audio Engine · {tasks.length} tracked items
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Add Task Bar */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-3 px-6 py-3.5 bg-slate-950/60 border-b border-slate-800 flex-wrap"
        >
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add new engineering task to Sprint 42..."
            className="flex-1 min-w-[240px] px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <select
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="Leandro (You)">Leandro (You)</option>
            <option value="Lucas Mendes">Lucas Mendes</option>
            <option value="Sofia Chen">Sofia Chen</option>
            <option value="Rafael Costa">Rafael Costa</option>
            <option value="Elena Rostova">Elena Rostova</option>
          </select>
          <select
            value={estimate}
            onChange={(e) => setEstimate(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="2 pts">2 pts</option>
            <option value="3 pts">3 pts</option>
            <option value="5 pts">5 pts</option>
            <option value="8 pts">8 pts</option>
          </select>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Task</span>
          </button>
        </form>

        {/* Columns */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 overflow-y-auto flex-1">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col);
            return (
              <div key={col} className="flex flex-col bg-slate-950/60 border border-slate-800/80 rounded-lg p-3.5">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                  <span className="text-xs font-semibold text-slate-200">{col}</span>
                  <span className="text-xs font-mono text-slate-400 tabular-nums">{colTasks.length}</span>
                </div>

                <div className="space-y-2.5 flex-1">
                  {colTasks.map((task) => {
                    const nextStatus = getNextStatus(task.status);
                    return (
                      <div
                        key={task.id}
                        className="p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mb-1 tabular-nums">
                          <span>{task.id}</span>
                          <span>{task.estimate}</span>
                        </div>
                        <p className="text-xs font-medium text-slate-100 leading-snug mb-2.5">
                          {task.title}
                        </p>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                          <span className="truncate">{task.assignee}</span>
                          {nextStatus ? (
                            <button
                              onClick={() => onMoveTask(task.id, nextStatus)}
                              className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer shrink-0"
                              title={`Move to ${nextStatus}`}
                            >
                              <span>{nextStatus}</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          ) : (
                            <span className="flex items-center gap-1 text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Complete</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
