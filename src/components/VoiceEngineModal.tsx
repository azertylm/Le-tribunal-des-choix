import React from 'react';
import { Sliders, X } from 'lucide-react';
import type { BazarSettings, GenerationMode } from '../types/bazar';

interface VoiceEngineModalProps {
  isOpen: boolean;
  settings: BazarSettings;
  aiAvailable: boolean;
  onClose: () => void;
  onUpdate: (patch: Partial<BazarSettings>) => void;
}

export const VoiceEngineModal: React.FC<VoiceEngineModalProps> = ({
  isOpen,
  settings,
  aiAvailable,
  onClose,
  onUpdate,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-4 no-print"
      role="dialog"
      aria-modal="true"
      aria-labelledby="studio-settings-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#141418] border-2 border-[#0f172a] dark:border-[#3f3f46] p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-[#4338ca] dark:text-yellow-400" />
            <h2 id="studio-settings-title" className="font-serif text-2xl font-black">
              Réglages du Studio
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer les réglages du studio"
            className="w-11 h-11 rounded-xl border border-[#cbd5e1] dark:border-[#3f3f46] bg-[#f8fafc] dark:bg-[#1e1e24] flex items-center justify-center hover:bg-[#e2e8f0] dark:hover:bg-[#27272a] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-bold">Moteur de rédaction satirique</p>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Moteur de génération">
            {(
              [
                {
                  id: 'demo' as GenerationMode,
                  title: 'Mode Démo',
                  desc: 'Instantané · Hors-ligne',
                },
                {
                  id: 'gemini' as GenerationMode,
                  title: 'IA Gemini',
                  desc: aiAvailable ? 'Connecté au serveur' : 'Serveur non configuré',
                },
              ] as const
            ).map((opt) => {
              const selected = settings.mode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onUpdate({ mode: opt.id })}
                  className={`p-3 rounded-xl border-2 text-left transition-colors ${
                    selected
                      ? 'border-[#0f172a] bg-yellow-300 text-[#0f172a] dark:border-yellow-400 dark:bg-yellow-400 dark:text-[#0f172a]'
                      : 'border-[#cbd5e1] dark:border-[#3f3f46] bg-[#f8fafc] dark:bg-[#18181b] hover:border-[#0f172a]'
                  }`}
                >
                  <p className="font-extrabold text-sm">{opt.title}</p>
                  <p className="text-xs opacity-80 mt-0.5">{opt.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="tts-speed-range" className="text-sm font-bold">
              Vitesse de lecture vocale (TTS)
            </label>
            <span className="font-mono text-sm font-bold text-[#4338ca] dark:text-yellow-300 tabular-nums">
              {settings.ttsSpeed.toFixed(2)}x
            </span>
          </div>
          <input
            id="tts-speed-range"
            type="range"
            min="0.75"
            max="1.5"
            step="0.05"
            value={settings.ttsSpeed}
            onChange={(e) => onUpdate({ ttsSpeed: parseFloat(e.target.value) || 1.05 })}
            className="w-full accent-[#0f172a] dark:accent-yellow-400 h-3 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-xs font-medium text-[#64748b] dark:text-[#a1a1aa] tabular-nums">
            <span>0.75x Lent</span>
            <span>1.00x Normal</span>
            <span>1.50x Rapide</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[48px] rounded-xl border-2 border-[#0f172a] dark:border-yellow-400 bg-yellow-400 hover:bg-yellow-300 text-[#0f172a] font-extrabold text-sm shadow-pop-sm transition-colors"
        >
          Appliquer et fermer
        </button>
      </div>
    </div>
  );
};
