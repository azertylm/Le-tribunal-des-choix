import React, { useState } from 'react';
import { Plus, Users, X } from 'lucide-react';
import type { PlayerPlea } from '../types/bazar';

interface ParticipantBarProps {
  participants: PlayerPlea[];
  onAddParticipant: (name?: string) => void;
  onRemoveParticipant: (id: string) => void;
}

export const ParticipantBar: React.FC<ParticipantBarProps> = ({
  participants,
  onAddParticipant,
  onRemoveParticipant,
}) => {
  const [draftName, setDraftName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddParticipant(draftName);
    setDraftName('');
  };

  return (
    <section
      aria-label="Gestion des participants"
      data-testid="participant-bar"
      className="rounded-2xl p-4 sm:p-5 border-2 border-[#0f172a] dark:border-[#3f3f46] bg-white dark:bg-[#141418] mb-5 space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Users className="w-4 h-4 text-[#4338ca] dark:text-yellow-400 shrink-0" />
          <p className="text-xs sm:text-sm font-extrabold text-[#0f172a] dark:text-white">
            Table des participants{' '}
            <span className="font-mono text-[#4338ca] dark:text-yellow-300 tabular-nums">
              ({participants.length})
            </span>
          </p>
          <span className="hidden sm:inline text-xs text-[#64748b] dark:text-[#a1a1aa]">
            · Nombre illimité
          </span>
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="Ajouter un prénom..."
            aria-label="Prénom du nouveau participant"
            className="flex-1 sm:w-44 min-h-[42px] px-3 rounded-xl border border-[#cbd5e1] dark:border-[#3f3f46] bg-[#f8fafc] dark:bg-[#09090b] text-sm font-semibold placeholder:text-[#64748b]"
          />
          <button
            type="submit"
            data-testid="add-participant-btn"
            className="min-h-[42px] px-3.5 rounded-xl border-2 border-[#0f172a] dark:border-yellow-400 bg-yellow-400 hover:bg-yellow-300 text-[#0f172a] font-extrabold text-xs sm:text-sm inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Ajouter</span>
          </button>
        </form>
      </div>

      <div
        className="flex flex-wrap items-center gap-x-2 gap-y-2 pt-1"
        data-testid="participant-list"
      >
        {participants.map((p, idx) => (
          <div
            key={p.id}
            className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-xl border border-[#cbd5e1] dark:border-[#3f3f46] bg-[#f8fafc] dark:bg-[#18181b] text-xs sm:text-sm font-bold"
          >
            <span className="font-mono text-[11px] text-[#64748b] dark:text-[#a1a1aa] tabular-nums">
              {idx + 1}.
            </span>
            <span className="max-w-[130px] truncate">{p.name.trim() || `Participant ${idx + 1}`}</span>
            {participants.length > 2 && (
              <button
                type="button"
                onClick={() => onRemoveParticipant(p.id)}
                aria-label={`Retirer ${p.name.trim() || `Participant ${idx + 1}`}`}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-[#64748b] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};
