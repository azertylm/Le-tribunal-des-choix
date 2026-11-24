import React from 'react';
import { Award, Download, Scale, Square, Volume2 } from 'lucide-react';
import type { DecisionResult } from '../types/bazar';
import { exportDecisionPNG } from '../utils/canvasExport';

interface DecisionDecreeCardProps {
  decree: DecisionResult | null;
  emptyTitle: string;
  emptyDescription: string;
  cardRef?: React.RefObject<HTMLElement | null>;
  onSpeak: (text: string) => void;
  onStopSpeech: () => void;
  onNotify: (msg: string) => void;
}

export const DecisionDecreeCard: React.FC<DecisionDecreeCardProps> = ({
  decree,
  emptyTitle,
  emptyDescription,
  cardRef,
  onSpeak,
  onStopSpeech,
  onNotify,
}) => {
  if (!decree) {
    return (
      <div className="rounded-2xl p-6 border-2 border-dashed border-[#cbd5e1] dark:border-[#3f3f46] newsprint-bg text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-[#0f172a] dark:bg-[#27272a] text-yellow-300 flex items-center justify-center mx-auto">
          <Award className="w-6 h-6" />
        </div>
        <h3 className="font-serif text-xl font-black">{emptyTitle}</h3>
        <p className="text-sm text-[#475569] dark:text-[#a1a1aa] max-w-xs mx-auto leading-relaxed">
          {emptyDescription}
        </p>
      </div>
    );
  }

  return (
    <article
      ref={cardRef}
      data-testid="decision-decree-card"
      className="scroll-mt-[124px] rounded-2xl p-5 sm:p-6 border-4 border-[#0f172a] dark:border-yellow-400 newsprint-bg shadow-pop space-y-4"
    >
      <div className="border-b-2 border-[#0f172a] dark:border-[#52525b] pb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-bold tracking-wider text-[#3f51b5] dark:text-yellow-300 tabular-nums">
            {decree.caseNumber}
          </p>
          <h3 className="font-serif text-2xl sm:text-3xl font-black tracking-tight mt-0.5">
            Décret du Tribunal
          </h3>
        </div>
        <Scale className="w-7 h-7 text-[#0f172a] dark:text-yellow-400 shrink-0" />
      </div>

      <p className="text-xs font-bold text-[#475569] dark:text-[#a1a1aa]">
        {decree.modeTitle}
        {decree.chosenNumber ? ` · Chiffre n°${decree.chosenNumber}` : ''}
        {decree.pickedBy ? ` (${decree.pickedBy})` : ''} ·{' '}
        {decree.source === 'gemini' ? 'Juge IA Gemini' : 'Mode Démo'}
      </p>

      <div className="p-4 rounded-xl border-2 border-[#0f172a] dark:border-emerald-400 bg-emerald-700 text-white dark:bg-emerald-500/20 dark:text-emerald-100">
        <p className="text-xs font-extrabold tracking-wider opacity-95">Choix Retenu Sans Appel</p>
        <p data-testid="decree-winner" className="font-serif text-2xl sm:text-3xl font-black mt-1 leading-tight">
          {decree.winner}
        </p>
      </div>

      <p className="text-sm sm:text-base font-medium leading-relaxed whitespace-pre-line text-[#0f172a] dark:text-[#f4f4f5]">
        {decree.reasoning}
      </p>

      <div className="p-4 rounded-xl border-2 border-[#0f172a] dark:border-yellow-400 bg-yellow-300 text-[#0f172a] dark:bg-yellow-400/20 dark:text-yellow-100">
        <p className="text-xs font-extrabold tracking-wider">Clause Bonus du Tribunal</p>
        <p className="font-bold text-sm sm:text-base mt-1 leading-snug">{decree.miniChallenge}</p>
      </div>

      {decree.allOptions && decree.allOptions.length > 0 && (
        <div className="pt-2 border-t border-[#0f172a]/15 dark:border-[#3f3f46] space-y-1.5">
          <p className="text-xs font-extrabold text-[#475569] dark:text-[#a1a1aa]">
            Ce que cachaient les numéros
          </p>
          <ul className="space-y-1 text-xs sm:text-sm">
            {decree.allOptions.map((item) => {
              const isWinner = item.label === decree.winner && (!decree.chosenNumber || item.index === decree.chosenNumber);
              return (
                <li
                  key={`${item.index}-${item.label}`}
                  className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg ${
                    isWinner
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 font-extrabold text-emerald-950 dark:text-emerald-200'
                      : 'text-[#475569] dark:text-[#a1a1aa]'
                  }`}
                >
                  <span className="truncate">
                    <span className="font-mono font-bold mr-2 tabular-nums">N°{item.index}</span>
                    <span className={item.eliminatedBy ? 'line-through' : ''}>{item.label}</span>
                  </span>
                  {isWinner ? (
                    <span className="text-xs font-extrabold shrink-0">Élu</span>
                  ) : item.eliminatedBy ? (
                    <span className="text-[11px] shrink-0">Veto {item.eliminatedBy}</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#0f172a]/20 dark:border-[#3f3f46]">
        <button
          type="button"
          onClick={() =>
            onSpeak(
              `Décret du Tribunal des Choix ! Le choix retenu sans appel est : ${decree.winner}. ${decree.reasoning}. Clause bonus : ${decree.miniChallenge}`
            )
          }
          className="flex-1 min-h-[46px] px-3.5 rounded-xl border-2 border-[#0f172a] dark:border-[#52525b] bg-white dark:bg-[#18181b] font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap"
        >
          <Volume2 className="w-4 h-4 shrink-0" />
          <span>Écouter le décret</span>
        </button>
        <button
          type="button"
          onClick={onStopSpeech}
          aria-label="Arrêter la lecture du décret"
          className="w-[46px] h-[46px] rounded-xl border-2 border-[#0f172a] dark:border-[#52525b] bg-white dark:bg-[#18181b] flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
        >
          <Square className="w-4 h-4 fill-current" />
        </button>
        <button
          type="button"
          onClick={() => exportDecisionPNG(decree, onNotify)}
          className="w-full min-h-[46px] px-4 rounded-xl border-2 border-[#0f172a] dark:border-yellow-400 bg-yellow-400 hover:bg-yellow-300 text-[#0f172a] font-extrabold text-sm inline-flex items-center justify-center gap-2 shadow-pop-sm transition-colors"
        >
          <Download className="w-4 h-4 shrink-0" />
          <span>Partager le décret (PNG)</span>
        </button>
      </div>
    </article>
  );
};
