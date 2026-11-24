import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Dices,
  Eye,
  EyeOff,
  Lock,
  Mic,
  Plus,
  RotateCcw,
  Shuffle,
  Sparkles,
  Square,
  Trash2,
} from 'lucide-react';
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
  makeOptionsFromLabels,
  OPTION_PRESETS,
  parseSpokenNumber,
  shuffleList,
} from '../utils/bazarLogic';
import { playDrumroll, playFanfare, playGavel } from '../utils/soundEngine';
import { DecisionDecreeCard } from './DecisionDecreeCard';

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface MysteryNumberModeProps {
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

type MysteryPhase = 'setup' | 'blind' | 'revealed';

export const MysteryNumberMode: React.FC<MysteryNumberModeProps> = ({
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
  const [phase, setPhase] = useState<MysteryPhase>('setup');
  const [draftOption, setDraftOption] = useState('');
  const [pickerId, setPickerId] = useState<string>(participants[1]?.id || participants[0]?.id || '');
  const [isListening, setIsListening] = useState(false);
  const [heardTranscript, setHeardTranscript] = useState('');
  const [isSuggestingAI, setIsSuggestingAI] = useState(false);
  const [isGeneratingDecree, setIsGeneratingDecree] = useState(false);
  const [chosenNumber, setChosenNumber] = useState<number | null>(null);
  const [decree, setDecree] = useState<DecisionResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const decreeCardRef = useRef<HTMLElement | null>(null);

  // Keep pickerId valid if participants list changes
  useEffect(() => {
    if (!participants.some((p) => p.id === pickerId) && participants.length > 0) {
      setPickerId(participants[participants.length > 1 ? 1 : 0].id);
    }
  }, [participants, pickerId]);

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  useEffect(() => {
    return () => stopListening();
  }, []);

  const validOptions = options.filter((o) => o.label.trim().length > 0);
  const pickerName =
    participants.find((p) => p.id === pickerId)?.name.trim() ||
    participants[0]?.name.trim() ||
    'Un participant';

  const handleAddOption = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = draftOption.trim();
    if (!clean) return;
    onOptionsChange([...options, { id: createOptionId(), label: clean }]);
    setDraftOption('');
  };

  const handleMoveOption = (idx: number, direction: -1 | 1) => {
    const target = idx + direction;
    if (target < 0 || target >= options.length) return;
    const copy = [...options];
    const tmp = copy[idx];
    copy[idx] = copy[target];
    copy[target] = tmp;
    onOptionsChange(copy);
  };

  const handleRemoveOption = (id: string) => {
    if (options.length <= 2) {
      onNotify('Gardez au moins 2 propositions pour tirer un chiffre.');
      return;
    }
    onOptionsChange(options.filter((o) => o.id !== id));
  };

  const handleShuffle = () => {
    onOptionsChange(shuffleList(options));
    onNotify('Ordre des numéros mélangé secrètement !');
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
            participants: participants.map((p) => p.name),
            existingOptions: options.map((o) => o.label),
            count: 5,
          }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          setApiError(
            payload.error || 'Suggestions IA indisponibles. Basculez en Mode Démo ou utilisez les idées rapides.'
          );
          return;
        }
        const data = await res.json();
        if (Array.isArray(data.options) && data.options.length > 0) {
          onOptionsChange(makeOptionsFromLabels(data.options));
          onNotify('Nouvelles propositions générées par l’IA Gemini !');
        }
      } else {
        const demoLabels = buildDemoSuggestedOptions(topic);
        onOptionsChange(makeOptionsFromLabels(demoLabels));
        onNotify('Nouvelles idées chargées (Mode Démo) !');
      }
    } catch {
      setApiError('Erreur réseau vers le serveur IA.');
    } finally {
      setIsSuggestingAI(false);
    }
  };

  const handleLockAndHide = () => {
    if (validOptions.length < 2) {
      onNotify('Ajoutez au moins 2 propositions avant de masquer la liste.');
      return;
    }
    setApiError(null);
    setDecree(null);
    setChosenNumber(null);
    setHeardTranscript('');
    setPhase('blind');
    playGavel();
    onNotify(`Choix masqués ! ${pickerName}, dis un chiffre entre 1 et ${validOptions.length} !`);
  };

  const revealNumber = async (num: number) => {
    if (num < 1 || num > validOptions.length) return;
    stopListening();
    onStopSpeech();
    setChosenNumber(num);
    setPhase('revealed');
    setApiError(null);
    playDrumroll();

    const winningOpt = validOptions[num - 1];
    const otherOpts = validOptions.filter((_, i) => i !== num - 1).map((o) => o.label);
    const cleanTopic = topic.trim() || 'Le grand choix du jour';

    setIsGeneratingDecree(true);
    try {
      let reasoning = '';
      let miniChallenge = '';
      let usedSource: GenerationMode = mode;

      if (mode === 'gemini') {
        const res = await fetch('/api/ai/commentary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modeTitle: 'Chiffre Mystère Oral',
            topic: cleanTopic,
            winner: winningOpt.label,
            chosenNumber: num,
            pickedBy: pickerName,
            participants: participants.map((p) => p.name),
            otherOptions: otherOpts,
          }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          setApiError(
            payload.error || 'Le Juge IA est indisponible. Basculez en Mode Démo pour afficher son commentaire.'
          );
          const fallback = buildDemoDecisionVerdict({
            mode: 'mystery',
            topic: cleanTopic,
            winner: winningOpt.label,
            chosenNumber: num,
            pickedBy: pickerName,
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
          mode: 'mystery',
          topic: cleanTopic,
          winner: winningOpt.label,
          chosenNumber: num,
          pickedBy: pickerName,
          optionsCount: validOptions.length,
        });
        reasoning = demo.reasoning;
        miniChallenge = demo.miniChallenge;
        usedSource = 'demo';
      }

      playFanfare();
      const nextDecree: DecisionResult = {
        caseNumber: formatCaseNumber(new Date().getFullYear()),
        mode: 'mystery',
        modeTitle: 'Chiffre Mystère Oral',
        topic: cleanTopic,
        winner: winningOpt.label,
        chosenNumber: num,
        pickedBy: pickerName,
        reasoning,
        miniChallenge,
        source: usedSource,
        allOptions: validOptions.map((o, idx) => ({
          index: idx + 1,
          label: o.label,
        })),
      };
      setDecree(nextDecree);
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

  const handleToggleVoicePick = () => {
    if (isListening) {
      stopListening();
      return;
    }

    const SpeechRecCtor =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance })
        .webkitSpeechRecognition;

    if (!SpeechRecCtor) {
      onNotify(
        `Micro vocal non supporté sur ce navigateur : appuyez directement sur le chiffre de 1 à ${validOptions.length}.`
      );
      return;
    }

    const rec = new SpeechRecCtor();
    rec.lang = 'fr-FR';
    rec.continuous = false;
    rec.interimResults = true;
    setHeardTranscript('');
    setIsListening(true);

    rec.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += `${event.results[i][0].transcript} `;
      }
      const clean = transcript.trim();
      setHeardTranscript(clean);
      const parsed = parseSpokenNumber(clean, validOptions.length);
      if (parsed !== null) {
        void revealNumber(parsed);
      }
    };

    rec.onerror = () => {
      setIsListening(false);
      onNotify('Micro indisponible : vous pouvez toucher directement un numéro ci-dessous.');
    };

    rec.onend = () => {
      setIsListening(false);
    };

    try {
      rec.start();
      recognitionRef.current = rec;
    } catch {
      setIsListening(false);
      onNotify('Impossible de lancer le micro : choisissez directement un numéro.');
    }
  };

  return (
    <section
      aria-labelledby="heading-mystery"
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
    >
      {/* Colonne gauche */}
      <div className="lg:col-span-7 space-y-5">
        <div className="rounded-2xl p-5 sm:p-6 border-2 border-[#0f172a] dark:border-indigo-400/60 bg-[#eef2ff] dark:bg-[#141418] shadow-pop space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-extrabold tracking-wide text-[#3730a3] dark:text-indigo-300">
              {phase === 'setup' && 'Étape 1 sur 2 · Ordre secret des propositions'}
              {phase === 'blind' && 'Étape 2 sur 2 · Choix oral à l’aveugle'}
              {phase === 'revealed' && 'Sceau brisé · Numéros dévoilés'}
            </p>
            <span className="text-xs font-mono font-bold text-[#475569] dark:text-[#a1a1aa] tabular-nums">
              {validOptions.length} choix numérotés
            </span>
          </div>

          <div>
            <h2
              id="heading-mystery"
              className="font-serif text-2xl sm:text-3xl font-black tracking-tight leading-tight text-balance"
            >
              Chiffre Mystère (Oral)
            </h2>
            {!simpleMode && (
              <p className="text-sm text-[#334155] dark:text-[#a1a1aa] mt-1.5 leading-relaxed">
                Quelqu’un fixe secrètement un ordre (1, 2, 3…), cache la liste, puis un autre
                protagoniste annonce son chiffre à voix haute.
              </p>
            )}
          </div>

          {phase === 'setup' && (
            <>
              <div className="space-y-2">
                <label
                  htmlFor="mystery-topic"
                  className="block text-xs font-extrabold text-[#334155] dark:text-[#d4d4d8]"
                >
                  Question à trancher
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="mystery-topic"
                    type="text"
                    value={topic}
                    onChange={(e) => onTopicChange(e.target.value)}
                    placeholder="Ex : Quel restaurant choisir ce soir ?"
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

              {/* Packs rapides */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-[#475569] dark:text-[#a1a1aa]">
                  Exemples :
                </span>
                {OPTION_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      onTopicChange(preset.topic);
                      onOptionsChange(makeOptionsFromLabels(preset.options));
                      onNotify(`Liste « ${preset.label} » chargée !`);
                    }}
                    className="min-h-[36px] px-3 rounded-lg border border-[#cbd5e1] dark:border-[#3f3f46] bg-white dark:bg-[#18181b] hover:border-[#0f172a] dark:hover:border-yellow-400 text-xs font-bold transition-colors whitespace-nowrap"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </>
          )}
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

        {/* PHASE 1 : Préparation de l'ordre secret */}
        {phase === 'setup' && (
          <div className="rounded-2xl p-5 border-2 border-[#0f172a] dark:border-[#3f3f46] bg-white dark:bg-[#141418] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs sm:text-sm font-extrabold text-[#0f172a] dark:text-white">
                Ordre numéroté des propositions (1 à {options.length})
              </p>
              <button
                type="button"
                onClick={handleShuffle}
                className="min-h-[38px] px-3 rounded-xl border border-[#cbd5e1] dark:border-[#3f3f46] bg-[#f8fafc] dark:bg-[#18181b] hover:border-[#0f172a] text-xs font-extrabold inline-flex items-center gap-1.5 transition-colors"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Mélanger l’ordre</span>
              </button>
            </div>

            <div className="space-y-2.5" data-testid="mystery-options-list">
              {options.map((opt, idx) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <span className="w-10 h-11 rounded-xl bg-[#0f172a] dark:bg-indigo-500 text-yellow-300 dark:text-white font-mono font-extrabold text-sm flex items-center justify-center shrink-0 tabular-nums">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={opt.label}
                    aria-label={`Proposition numéro ${idx + 1}`}
                    onChange={(e) =>
                      onOptionsChange(
                        options.map((item) =>
                          item.id === opt.id ? { ...item, label: e.target.value } : item
                        )
                      )
                    }
                    placeholder={`Proposition n°${idx + 1}...`}
                    className="flex-1 min-w-0 min-h-[44px] px-3.5 rounded-xl border border-[#cbd5e1] dark:border-[#3f3f46] bg-[#f8fafc] dark:bg-[#09090b] font-semibold text-sm sm:text-base"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveOption(idx, -1)}
                      aria-label={`Monter la proposition ${idx + 1}`}
                      className="w-9 h-11 rounded-lg border border-[#cbd5e1] dark:border-[#3f3f46] bg-[#f8fafc] dark:bg-[#18181b] disabled:opacity-35 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === options.length - 1}
                      onClick={() => handleMoveOption(idx, 1)}
                      aria-label={`Descendre la proposition ${idx + 1}`}
                      className="w-9 h-11 rounded-lg border border-[#cbd5e1] dark:border-[#3f3f46] bg-[#f8fafc] dark:bg-[#18181b] disabled:opacity-35 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(opt.id)}
                      aria-label={`Supprimer la proposition ${idx + 1}`}
                      className="w-9 h-11 rounded-lg border border-[#cbd5e1] dark:border-[#3f3f46] bg-[#f8fafc] dark:bg-[#18181b] text-[#64748b] hover:text-red-600 flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddOption} className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={draftOption}
                onChange={(e) => setDraftOption(e.target.value)}
                placeholder="Ajouter une proposition (ex : Pizzeria napolitaine)..."
                aria-label="Nouvelle proposition"
                className="flex-1 min-h-[44px] px-3.5 rounded-xl border border-dashed border-[#94a3b8] dark:border-[#52525b] bg-[#f8fafc] dark:bg-[#09090b] text-sm font-medium placeholder:text-[#64748b]"
              />
              <button
                type="submit"
                className="min-h-[44px] px-4 rounded-xl border-2 border-[#0f172a] dark:border-[#52525b] bg-[#0f172a] dark:bg-[#27272a] text-white font-extrabold text-xs sm:text-sm inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter</span>
              </button>
            </form>

            {/* Qui va annoncer le chiffre ? */}
            <div className="pt-3 border-t border-[#e2e8f0] dark:border-[#27272a] space-y-2">
              <label
                htmlFor="mystery-picker-select"
                className="block text-xs font-extrabold text-[#334155] dark:text-[#d4d4d8]"
              >
                Qui va choisir un chiffre à l’aveugle ?
              </label>
              <select
                id="mystery-picker-select"
                value={pickerId}
                onChange={(e) => setPickerId(e.target.value)}
                className="w-full min-h-[46px] px-3.5 rounded-xl border-2 border-[#0f172a] dark:border-[#3f3f46] bg-[#f8fafc] dark:bg-[#09090b] font-bold text-sm"
              >
                {participants.map((p, i) => (
                  <option key={p.id} value={p.id}>
                    {p.name.trim() || `Participant ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              data-testid="lock-mystery-btn"
              onClick={handleLockAndHide}
              className="w-full min-h-[54px] rounded-xl border-2 border-[#0f172a] dark:border-indigo-400 bg-[#4338ca] hover:bg-[#3730a3] text-white font-extrabold text-base inline-flex items-center justify-center gap-2.5 shadow-pop active:translate-y-0.5 transition-transform"
            >
              <EyeOff className="w-5 h-5" />
              <span>Cacher les choix & Passer à l’oral</span>
            </button>
          </div>
        )}

        {/* PHASE 2 : Mode Aveugle — Choix oral ou tactile */}
        {phase === 'blind' && (
          <div
            data-testid="mystery-blind-stage"
            className="rounded-2xl p-5 sm:p-6 border-2 border-[#0f172a] dark:border-yellow-400 bg-white dark:bg-[#141418] space-y-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-extrabold text-[#4338ca] dark:text-yellow-300">
                  Au tour de {pickerName} !
                </p>
                <h3 className="font-serif text-xl sm:text-2xl font-black mt-0.5">
                  Annoncez un chiffre entre 1 et {validOptions.length}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopListening();
                  setPhase('setup');
                }}
                className="min-h-[40px] px-3 rounded-xl border border-[#cbd5e1] dark:border-[#3f3f46] bg-[#f8fafc] dark:bg-[#18181b] text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Eye className="w-4 h-4" />
                <span>Modifier la liste</span>
              </button>
            </div>

            {/* Contrôle vocal principal */}
            <div className="p-4 rounded-xl border-2 border-[#0f172a] dark:border-[#3f3f46] bg-[#f8fafc] dark:bg-[#09090b] space-y-3 text-center">
              <button
                type="button"
                onClick={handleToggleVoicePick}
                className={`w-full min-h-[54px] px-5 rounded-xl border-2 border-[#0f172a] font-extrabold text-base inline-flex items-center justify-center gap-2.5 transition-colors ${
                  isListening
                    ? 'bg-red-600 text-white mic-recording'
                    : 'bg-yellow-400 hover:bg-yellow-300 text-[#0f172a] shadow-pop-sm'
                }`}
              >
                {isListening ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
                <span>
                  {isListening
                    ? 'Écoute en cours… dites un chiffre !'
                    : `Dire le chiffre au micro (${pickerName})`}
                </span>
              </button>
              {heardTranscript && (
                <p className="text-xs font-semibold text-[#475569] dark:text-[#a1a1aa]">
                  Entendu : « {heardTranscript} »
                </p>
              )}
              <p className="text-xs text-[#64748b] dark:text-[#a1a1aa]">
                Dites simplement « Un », « Deux », « Numéro 3 »… ou touchez directement une carte scellée ci-dessous.
              </p>
            </div>

            {/* Cartes scellées cliquables */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" data-testid="sealed-number-grid">
              {validOptions.map((opt, idx) => {
                const num = idx + 1;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    data-testid={`sealed-choice-${num}`}
                    onClick={() => void revealNumber(num)}
                    className="min-h-[104px] rounded-2xl border-2 border-[#0f172a] dark:border-yellow-400/70 bg-[#182334] hover:bg-[#23324a] text-white p-4 flex flex-col items-center justify-center gap-1.5 shadow-pop-sm active:translate-y-0.5 transition-all"
                  >
                    <Lock className="w-4 h-4 text-yellow-300" />
                    <span className="font-serif text-3xl font-black text-yellow-300 tabular-nums">
                      N° {num}
                    </span>
                    <span className="text-[11px] font-bold text-slate-300">Choix secret</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                const randomNum = 1 + Math.floor(Math.random() * validOptions.length);
                void revealNumber(randomNum);
              }}
              className="w-full min-h-[44px] rounded-xl border border-[#cbd5e1] dark:border-[#3f3f46] bg-[#f8fafc] dark:bg-[#18181b] hover:bg-zinc-200 dark:hover:bg-zinc-800 text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-2 transition-colors"
            >
              <Dices className="w-4 h-4" />
              <span>Laisser le hasard choisir un numéro</span>
            </button>
          </div>
        )}

        {/* PHASE 3 : Révélation des cartes */}
        {phase === 'revealed' && (
          <div className="rounded-2xl p-5 sm:p-6 border-2 border-[#0f172a] dark:border-[#3f3f46] bg-white dark:bg-[#141418] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-serif text-xl sm:text-2xl font-black">
                Tous les numéros révélés
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onOptionsChange(shuffleList(validOptions));
                    setDecree(null);
                    setChosenNumber(null);
                    setPhase('blind');
                    onNotify('Liste remélangée et masquée ! Nouveau tirage oral.');
                  }}
                  className="min-h-[40px] px-3 rounded-xl border-2 border-[#0f172a] dark:border-yellow-400 bg-yellow-400 text-[#0f172a] text-xs font-extrabold inline-flex items-center gap-1.5"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Remélanger & Rejouer</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDecree(null);
                    setChosenNumber(null);
                    setPhase('setup');
                  }}
                  className="min-h-[40px] px-3 rounded-xl border border-[#cbd5e1] dark:border-[#3f3f46] bg-[#f8fafc] dark:bg-[#18181b] text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Éditer</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {validOptions.map((opt, idx) => {
                const num = idx + 1;
                const isPicked = num === chosenNumber;
                return (
                  <div
                    key={opt.id}
                    className={`p-4 rounded-xl border-2 transition-colors ${
                      isPicked
                        ? 'border-[#0f172a] bg-emerald-600 text-white dark:border-emerald-400 shadow-pop-sm'
                        : 'border-[#cbd5e1] dark:border-[#3f3f46] bg-[#f8fafc] dark:bg-[#18181b] opacity-85'
                    }`}
                  >
                    <p
                      className={`font-mono text-xs font-extrabold tabular-nums ${
                        isPicked ? 'text-yellow-300' : 'text-[#64748b] dark:text-[#a1a1aa]'
                      }`}
                    >
                      NUMÉRO {num} {isPicked ? '· CHOISI !' : ''}
                    </p>
                    <p className="font-serif text-lg font-black mt-1 leading-snug">{opt.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Colonne droite : Décret Officiel */}
      <div className="lg:col-span-5 lg:sticky lg:top-[124px]">
        <DecisionDecreeCard
          decree={decree}
          cardRef={decreeCardRef}
          emptyTitle={
            isGeneratingDecree
              ? 'Le Juge rédige le décret…'
              : phase === 'blind'
                ? 'Enveloppes scellées !'
                : 'En attente du chiffre secret'
          }
          emptyDescription={
            phase === 'blind'
              ? `${pickerName} annonce son chiffre à voix haute (ou touche une carte scellée) pour briser le sceau.`
              : 'Numérotez vos propositions (ex : 1 Resto végétarien, 2 Resto japonais, 3 Resto burger), cachez-les et laissez parler le destin.'
          }
          onSpeak={onSpeak}
          onStopSpeech={onStopSpeech}
          onNotify={onNotify}
        />
      </div>
    </section>
  );
};
