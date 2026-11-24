import React, { useRef, useState } from 'react';
import { Ban, Plus, RotateCcw, Sparkles, Trophy } from 'lucide-react';
import type {
  DecisionOption,
  DecisionResult,
  GenerationMode,
  PlayerPlea,
} from '../types/bazar';
import {
  buildDemoDecisionVerdict,
  buildDemoSuggestedOptions,
  createOptionId,
  formatCaseNumber,
  getNextVetoTurn,
  makeOptionsFromLabels,
} from '../utils/bazarLogic';
import { playBuzzer, playFanfare } from '../utils/soundEngine';
import { DecisionDecreeCard } from './DecisionDecreeCard';

interface VetoCascadeModeProps {
  mode: GenerationMode;
  simpleMode: boolean;
  participants: PlayerPlea[];
  topic: string;
  options: DecisionOption[];
  onTopicChange: (topic: string) => void;
  onOptionsChange: (options: DecisionOption[]) => void;
  onSpeak: (text: string) => void;
  onStopSpeech: () => void;
  onNotify: (msg: string) => void;
  onSwitchToDemo: () => void;
}

export const VetoCascadeMode: React.FC<VetoCascadeModeProps> = ({
  mode,
  simpleMode,
  participants,
  topic,
  options,
  onTopicChange,
  onOptionsChange,
  onSpeak,
  onStopSpeech,
  onNotify,
  onSwitchToDemo,
}) => {
  const [eliminatedMap, setEliminatedMap] = useState<Record<string, string>>({});
  const [draftOption, setDraftOption] = useState('');
  const [isSuggestingAI, setIsSuggestingAI] = useState(false);
  const [isGeneratingDecree, setIsGeneratingDecree] = useState(false);
  const [decree, setDecree] = useState<DecisionResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const decreeCardRef = useRef<HTMLElement | null>(null);

  const validOptions = options.filter((o) => o.label.trim().length > 0);
  const remainingOptions = validOptions.filter((o) => !eliminatedMap[o.id]);
  const eliminatedCount = validOptions.length - remainingOptions.length;
  const participantNames = participants.map((p, idx) => p.name.trim() || `Participant ${idx + 1}`);
  const { currentPlayer, turnNumber } = getNextVetoTurn(participantNames, eliminatedCount);
  const isFinished = validOptions.length >= 2 && remainingOptions.length === 1;

  const resetVeto = () => {
    setEliminatedMap({});
    setDecree(null);
    setApiError(null);
  };

  const handleAddOption = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = draftOption.trim();
    if (!clean) return;
    onOptionsChange([...options, { id: createOptionId(), label: clean }]);
    setDraftOption('');
    if (decree) setDecree(null);
  };

  const handleSuggestAI = async () => {
    setApiError(null);
    setIsSuggestingAI(true);
    try {
      if (mode === 'gemini') {
        const res = await fetch('/api/ai/suggest-options', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic,
            participants: participantNames,
            existingOptions: options.map((o) => o.label),
            count: 5,
          }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          setApiError(payload.error || 'Suggestions IA indisponibles.');
          return;
        }
        const data = await res.json();
        if (Array.isArray(data.options) && data.options.length > 0) {
          onOptionsChange(makeOptionsFromLabels(data.options));
          resetVeto();
          onNotify('Nouvelles propositions générées par l’IA Gemini !');
        }
      } else {
        onOptionsChange(makeOptionsFromLabels(buildDemoSuggestedOptions(topic)));
        resetVeto();
        onNotify('Nouvelles propositions chargées (Mode Démo) !');
      }
    } catch {
      setApiError('Erreur réseau vers le serveur IA.');
    } finally {
      setIsSuggestingAI(false);
    }
  };

  const handleEliminate = async (option: DecisionOption) => {
    if (eliminatedMap[option.id] || remainingOptions.length <= 1) return;
    playBuzzer();
    const nextMap = { ...eliminatedMap, [option.id]: currentPlayer };
    setEliminatedMap(nextMap);

    const nextRemaining = validOptions.filter((o) => !nextMap[o.id]);
    if (nextRemaining.length > 1) {
      onNotify(`VETO ! ${currentPlayer} élimine « ${option.label} ».`);
      return;
    }

    // Last survivor crowned!
    const survivor = nextRemaining[0];
    if (!survivor) return;
    onStopSpeech();
    setApiError(null);
    setIsGeneratingDecree(true);

    const cleanTopic = topic.trim() || 'Le grand choix du groupe';
    const others = validOptions.filter((o) => o.id !== survivor.id).map((o) => o.label);

    try {
      let reasoning = '';
      let miniChallenge = '';
      let usedSource: GenerationMode = mode;

      if (mode === 'gemini') {
        const res = await fetch('/api/ai/commentary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modeTitle: 'Veto en Cascade',
            topic: cleanTopic,
            winner: survivor.label,
            participants: participantNames,
            otherOptions: others,
          }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          setApiError(payload.error || 'Le Juge IA est indisponible.');
          const fallback = buildDemoDecisionVerdict({
            mode: 'veto',
            topic: cleanTopic,
            winner: survivor.label,
            optionsCount: validOptions.length,
          });
          reasoning = fallback.reasoning;
          miniChallenge = fallback.miniChallenge;
          usedSource = 'demo';
        } else {
          const data = await res.json();
          reasoning = data.reasoning;
          miniChallenge = data.miniChallenge;
          usedSource = 'gemini';
        }
      } else {
        const demo = buildDemoDecisionVerdict({
          mode: 'veto',
          topic: cleanTopic,
          winner: survivor.label,
          optionsCount: validOptions.length,
        });
        reasoning = demo.reasoning;
        miniChallenge = demo.miniChallenge;
        usedSource = 'demo';
      }

      playFanfare();
      setDecree({
        caseNumber: formatCaseNumber(new Date().getFullYear()),
        mode: 'veto',
        modeTitle: 'Veto en Cascade',
        topic: cleanTopic,
        winner: survivor.label,
        reasoning,
        miniChallenge,
        source: usedSource,
        allOptions: validOptions.map((o, idx) => ({
          index: idx + 1,
          label: o.label,
          eliminatedBy: nextMap[o.id],
        })),
      });

      window.setTimeout(() => {
        if (window.innerWidth >= 1024) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          decreeCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 80);
    } catch {
      setApiError('Erreur réseau vers le serveur IA.');
    } finally {
      setIsGeneratingDecree(false);
    }
  };

  return (
    <section
      aria-labelledby="heading-veto"
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
    >
      <div className="lg:col-span-7 space-y-5">
        <div className="rounded-2xl p-5 sm:p-6 border-2 border-[#0f172a] dark:border-emerald-400/60 bg-[#ecfdf5] dark:bg-[#141418] shadow-pop space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-extrabold tracking-wide text-emerald-800 dark:text-emerald-300">
              {isFinished
                ? 'Survivant unique désigné !'
                : `Tour n°${turnNumber} · Droit de veto : ${currentPlayer}`}
            </p>
            <span className="font-mono text-xs font-bold text-[#475569] dark:text-[#a1a1aa] tabular-nums">
              {remainingOptions.length} restante{remainingOptions.length > 1 ? 's' : ''} / {validOptions.length}
            </span>
          </div>

          <div>
            <h2
              id="heading-veto"
              className="font-serif text-2xl sm:text-3xl font-black tracking-tight leading-tight text-balance"
            >
              Veto en Cascade
            </h2>
            {!simpleMode && (
              <p className="text-sm text-[#334155] dark:text-[#a1a1aa] mt-1.5 leading-relaxed">
                Impossible de choisir ce que vous voulez ? Éliminez à tour de rôle ce dont vous ne
                voulez PAS jusqu’au dernier survivant !
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={topic}
              aria-label="Sujet du veto en cascade"
              onChange={(e) => onTopicChange(e.target.value)}
              placeholder="Ex : Quel restaurant ce soir ?"
              className="flex-1 min-h-[46px] px-4 rounded-xl border-2 border-[#0f172a] dark:border-[#3f3f46] bg-white dark:bg-[#09090b] font-semibold text-sm sm:text-base placeholder:text-[#64748b]"
            />
            <button
              type="button"
              disabled={isSuggestingAI}
              onClick={handleSuggestAI}
              className="min-h-[46px] px-4 rounded-xl border-2 border-[#0f172a] dark:border-yellow-400 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-60 text-[#0f172a] font-extrabold text-xs sm:text-sm whitespace-nowrap inline-flex items-center justify-center gap-2 shadow-pop-sm transition-colors"
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{isSuggestingAI ? 'Génération...' : mode === 'gemini' ? 'Idées IA' : 'Idées auto'}</span>
            </button>
          </div>
        </div>

        {apiError && (
          <div className="p-3.5 rounded-xl border border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200 text-sm flex flex-wrap items-center justify-between gap-2">
            <span>{apiError}</span>
            <button
              type="button"
              onClick={() => {
                onSwitchToDemo();
                setApiError(null);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#0f172a] text-yellow-300 font-bold text-xs whitespace-nowrap"
            >
              Passer en Mode Démo
            </button>
          </div>
        )}

        {/* Arène d'élimination */}
        <div className="rounded-2xl p-5 border-2 border-[#0f172a] dark:border-[#3f3f46] bg-white dark:bg-[#141418] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {isFinished ? (
              <p className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1.5">
                <Trophy className="w-4 h-4" />
                <span>Accord trouvé par élimination !</span>
              </p>
            ) : (
              <p className="text-sm font-extrabold text-[#0f172a] dark:text-white">
                À <span className="text-red-600 dark:text-yellow-300">{currentPlayer}</span> de
                poser son VETO :
              </p>
            )}

            {eliminatedCount > 0 && (
              <button
                type="button"
                onClick={resetVeto}
                className="min-h-[38px] px-3 rounded-xl border border-[#cbd5e1] dark:border-[#3f3f46] bg-[#f8fafc] dark:bg-[#18181b] text-xs font-bold inline-flex items-center gap-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Réinitialiser les vetos</span>
              </button>
            )}
          </div>

          <div className="space-y-2.5" data-testid="veto-options-list">
            {validOptions.map((opt, idx) => {
              const vetoBy = eliminatedMap[opt.id];
              const isSurvivor = isFinished && !vetoBy;
              return (
                <div
                  key={opt.id}
                  className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border-2 transition-all ${
                    isSurvivor
                      ? 'border-emerald-700 bg-emerald-600 text-white shadow-pop-sm'
                      : vetoBy
                        ? 'border-[#e2e8f0] dark:border-[#27272a] bg-[#f8fafc] dark:bg-[#09090b] opacity-60'
                        : 'border-[#0f172a] dark:border-[#3f3f46] bg-white dark:bg-[#18181b]'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-bold text-sm sm:text-base truncate ${
                        vetoBy ? 'line-through text-[#64748b] dark:text-[#71717a]' : ''
                      }`}
                    >
                      <span className="font-mono text-xs mr-2 opacity-75 tabular-nums">
                        {idx + 1}.
                      </span>
                      {opt.label}
                    </p>
                    {vetoBy && (
                      <p className="text-xs font-bold text-red-600 dark:text-red-400 mt-0.5">
                        Éliminé par {vetoBy}
                      </p>
                    )}
                    {isSurvivor && (
                      <p className="text-xs font-extrabold text-yellow-300 mt-0.5">
                        Dernier survivant — Choix unanime !
                      </p>
                    )}
                  </div>

                  {!vetoBy && !isFinished && (
                    <button
                      type="button"
                      data-testid={`veto-btn-${idx + 1}`}
                      onClick={() => void handleEliminate(opt)}
                      aria-label={`Poser un veto sur ${opt.label}`}
                      className="min-h-[42px] px-3.5 rounded-xl border-2 border-[#0f172a] dark:border-red-400 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs sm:text-sm inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
                    >
                      <Ban className="w-4 h-4 shrink-0" />
                      <span>Veto</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {!isFinished && (
            <form onSubmit={handleAddOption} className="flex items-center gap-2 pt-2">
              <input
                type="text"
                value={draftOption}
                onChange={(e) => setDraftOption(e.target.value)}
                placeholder="Ajouter une autre proposition à la table..."
                aria-label="Ajouter une proposition au veto"
                className="flex-1 min-h-[44px] px-3.5 rounded-xl border border-dashed border-[#94a3b8] dark:border-[#52525b] bg-[#f8fafc] dark:bg-[#09090b] text-sm font-medium placeholder:text-[#64748b]"
              />
              <button
                type="submit"
                className="min-h-[44px] px-4 rounded-xl border-2 border-[#0f172a] dark:border-[#52525b] bg-[#0f172a] dark:bg-[#27272a] text-white font-extrabold text-xs sm:text-sm inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Colonne droite : Décret Officiel */}
      <div className="lg:col-span-5 lg:sticky lg:top-[124px]">
        <DecisionDecreeCard
          decree={decree}
          cardRef={decreeCardRef}
          emptyTitle={
            isGeneratingDecree ? 'Le Juge scelle le consensus…' : 'Élimination en cours'
          }
          emptyDescription="Chaque participant pose son veto à tour de rôle sur la proposition qu’il veut écarter. La dernière option en lice remporte le décret."
          onSpeak={onSpeak}
          onStopSpeech={onStopSpeech}
          onNotify={onNotify}
        />
      </div>
    </section>
  );
};
