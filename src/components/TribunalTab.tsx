import React, { useEffect, useRef, useState } from 'react';
import {
  Dices,
  Download,
  Gavel,
  Handshake,
  Megaphone,
  Mic,
  Plus,
  Scale,
  Smile,
  Square,
  Trash2,
  Volume2,
} from 'lucide-react';
import type { GenerationMode, JudgeKey, PlayerPlea, VerdictResult } from '../types/bazar';
import {
  ABSURD_SUBJECTS,
  buildDemoVerdict,
  formatCaseNumber,
  JUDGE_META,
  pickNextDistinct,
} from '../utils/bazarLogic';
import { exportVerdictPNG } from '../utils/canvasExport';
import { playGavel } from '../utils/soundEngine';

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface TribunalTabProps {
  mode: GenerationMode;
  simpleMode: boolean;
  participants: PlayerPlea[];
  subject: string;
  onSubjectChange: (subject: string) => void;
  onUpdateParticipant: (id: string, patch: Partial<Pick<PlayerPlea, 'name' | 'plea'>>) => void;
  onAddParticipant: (name?: string) => void;
  onRemoveParticipant: (id: string) => void;
  onSpeak: (text: string) => void;
  onStopSpeech: () => void;
  onNotify: (msg: string) => void;
  onSwitchToDemo: () => void;
}

const PLAYER_ACCENT_BORDERS = [
  'border-[#1d4ed8] dark:border-blue-400/70',
  'border-[#dc2626] dark:border-red-400/70',
  'border-[#047857] dark:border-emerald-400/70',
  'border-[#7c3aed] dark:border-violet-400/70',
  'border-[#d97706] dark:border-amber-400/70',
  'border-[#be185d] dark:border-pink-400/70',
];

export const TribunalTab: React.FC<TribunalTabProps> = ({
  mode,
  simpleMode,
  participants,
  subject,
  onSubjectChange,
  onUpdateParticipant,
  onAddParticipant,
  onRemoveParticipant,
  onSpeak,
  onStopSpeech,
  onNotify,
  onSwitchToDemo,
}) => {
  const [judge, setJudge] = useState<JudgeKey>('solennel');
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(30);
  const [isDeliberating, setIsDeliberating] = useState<boolean>(false);
  const [verdict, setVerdict] = useState<VerdictResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const verdictCardRef = useRef<HTMLElement>(null);

  const stopRecording = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore recognition stop errors
      }
      recognitionRef.current = null;
    }
    setRecordingId(null);
    setSecondsLeft(30);
  };

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  const togglePlayerRecording = (player: PlayerPlea, idx: number) => {
    if (recordingId === player.id) {
      stopRecording();
      return;
    }
    stopRecording();
    setRecordingId(player.id);
    setSecondsLeft(30);

    const SpeechRecCtor =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance })
        .webkitSpeechRecognition;

    if (SpeechRecCtor) {
      const rec = new SpeechRecCtor();
      rec.lang = 'fr-FR';
      rec.continuous = true;
      rec.interimResults = true;
      const baseText = player.plea ? `${player.plea} ` : '';
      rec.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        onUpdateParticipant(player.id, { plea: (baseText + transcript).trim() });
      };
      rec.onerror = () =>
        onNotify('Micro indisponible : vous pouvez saisir la plaidoirie au clavier.');
      try {
        rec.start();
        recognitionRef.current = rec;
      } catch {
        onNotify('Impossible de démarrer le micro : chrono 30s lancé.');
      }
    } else {
      onNotify('Dictée vocale non supportée : chrono 30s lancé, saisissez au clavier.');
    }

    let remaining = 30;
    timerRef.current = window.setInterval(() => {
      remaining -= 1;
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        playGavel();
        onNotify(`Temps écoulé pour ${player.name || `Participant ${idx + 1}`} !`);
        stopRecording();
      }
    }, 1000);
  };

  const handleRenderVerdict = async () => {
    stopRecording();
    onStopSpeech();
    playGavel();
    setApiError(null);

    const cleanSubject = subject.trim() || 'Un litige domestique majeur';
    const activePlayers = participants.map((p, idx) => ({
      name: p.name.trim() || `Participant ${idx + 1}`,
      plea: p.plea.trim(),
    }));
    const judgeInfo = JUDGE_META[judge];

    setIsDeliberating(true);
    try {
      let generated: {
        culprit: string;
        reasoning: string;
        forfeit: string;
        compromise?: string;
      } | null = null;
      let usedSource: GenerationMode = mode;

      if (mode === 'gemini') {
        const res = await fetch('/api/verdict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: cleanSubject,
            players: activePlayers,
            judgeLabel: judgeInfo.label,
          }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          setApiError(
            payload.error ||
              'Le Juge IA est indisponible. Basculez en Mode Démo pour trancher immédiatement.'
          );
          setIsDeliberating(false);
          return;
        }
        generated = await res.json();
        usedSource = 'gemini';
      } else {
        generated = buildDemoVerdict(cleanSubject, activePlayers, judge);
        usedSource = 'demo';
      }

      if (!generated) return;

      const nextVerdict: VerdictResult = {
        caseNumber: formatCaseNumber(new Date().getFullYear()),
        subject: cleanSubject,
        judgeKey: judge,
        judgeLabel: judgeInfo.label,
        culprit: generated.culprit,
        reasoning: generated.reasoning,
        forfeit: generated.forfeit,
        compromise: generated.compromise,
        source: usedSource,
      };
      setVerdict(nextVerdict);
      window.setTimeout(() => {
        if (window.innerWidth >= 1024) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          verdictCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 60);
    } catch {
      setApiError('Erreur réseau vers le serveur IA. Basculez en Mode Démo hors-ligne.');
    } finally {
      setIsDeliberating(false);
    }
  };

  const judgeOptions: Array<{ key: JudgeKey; icon: React.ReactNode }> = [
    { key: 'solennel', icon: <Gavel className="w-5 h-5" /> },
    { key: 'satiriste', icon: <Smile className="w-5 h-5" /> },
    { key: 'sportif', icon: <Megaphone className="w-5 h-5" /> },
  ];

  return (
    <section
      aria-labelledby="heading-tribunal"
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
    >
      {/* Colonne gauche : Audience & Plaidoiries (nombre illimité) */}
      <div className="lg:col-span-7 space-y-5">
        <div className="rounded-2xl p-5 sm:p-6 border-2 border-[#0f172a] dark:border-red-500/50 bg-[#fff5f5] dark:bg-[#141418] shadow-pop space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-extrabold tracking-wide text-red-700 dark:text-red-400">
              Audience ouverte · {participants.length} participants à la barre
            </p>
            <button
              type="button"
              onClick={() => onAddParticipant()}
              className="min-h-[38px] px-3 rounded-xl border-2 border-[#0f172a] dark:border-yellow-400 bg-white dark:bg-[#18181b] hover:bg-yellow-300 dark:hover:bg-yellow-400 hover:text-[#0f172a] font-extrabold text-xs inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ 1 personne</span>
            </button>
          </div>

          <div>
            <h2
              id="heading-tribunal"
              className="font-serif text-2xl sm:text-3xl font-black tracking-tight leading-tight text-balance"
            >
              Le Tribunal des Choix
            </h2>
            {!simpleMode && (
              <p className="text-sm text-[#334155] dark:text-[#a1a1aa] mt-1.5 leading-relaxed">
                Chacun plaide sa cause en 30 secondes (à 2, 5 ou 20 !). Le Juge IA tranche,
                propose un compromis malin et inflige un gage absurde.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="tribunal-subject"
              className="block text-xs font-extrabold text-[#334155] dark:text-[#d4d4d8]"
            >
              Sujet du litige
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                id="tribunal-subject"
                type="text"
                value={subject}
                onChange={(e) => onSubjectChange(e.target.value)}
                placeholder="Ex : Où mange-t-on ce soir ?"
                className="flex-1 min-h-[48px] px-4 rounded-xl border-2 border-[#0f172a] dark:border-[#3f3f46] bg-white dark:bg-[#09090b] font-semibold text-sm sm:text-base placeholder:text-[#64748b]"
              />
              <button
                type="button"
                onClick={() => onSubjectChange(pickNextDistinct(ABSURD_SUBJECTS, subject))}
                className="min-h-[48px] px-4 rounded-xl border-2 border-[#0f172a] dark:border-yellow-400 bg-yellow-400 hover:bg-yellow-300 text-[#0f172a] font-extrabold text-sm whitespace-nowrap inline-flex items-center justify-center gap-2 shadow-pop-sm active:translate-y-0.5 transition-transform"
              >
                <Dices className="w-4 h-4 shrink-0" />
                <span>Sujet absurde</span>
              </button>
            </div>
          </div>
        </div>

        {/* Cartes de plaidoirie illimitées */}
        <div className="space-y-4" data-testid="plea-cards-list">
          {participants.map((player, idx) => {
            const isRec = recordingId === player.id;
            const borderCls = PLAYER_ACCENT_BORDERS[idx % PLAYER_ACCENT_BORDERS.length];
            return (
              <div
                key={player.id}
                className={`rounded-2xl p-4 sm:p-5 border-2 ${borderCls} bg-white dark:bg-[#141418] space-y-3`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-[#0f172a] dark:bg-[#27272a] text-yellow-300 font-mono font-bold text-xs flex items-center justify-center shrink-0 tabular-nums">
                      P{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={player.name}
                      aria-label={`Prénom du participant ${idx + 1}`}
                      onChange={(e) => onUpdateParticipant(player.id, { name: e.target.value })}
                      className="flex-1 min-w-0 min-h-[44px] px-3 rounded-xl border border-[#cbd5e1] dark:border-[#3f3f46] bg-[#f8fafc] dark:bg-[#09090b] font-bold text-sm sm:text-base"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => togglePlayerRecording(player, idx)}
                      aria-label={
                        isRec
                          ? `Arrêter la plaidoirie de ${player.name || `Participant ${idx + 1}`}`
                          : `Plaider au micro pour ${player.name || `Participant ${idx + 1}`}`
                      }
                      className={`min-h-[44px] px-3 rounded-xl border-2 border-[#0f172a] dark:border-[#52525b] font-extrabold text-xs sm:text-sm inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
                        isRec
                          ? 'bg-red-600 text-white mic-recording'
                          : 'bg-yellow-300 hover:bg-yellow-200 text-[#0f172a]'
                      }`}
                    >
                      {isRec ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-4 h-4" />}
                      <span>{isRec ? 'Stop' : 'Plaider'}</span>
                      <span className="font-mono text-xs tabular-nums px-1.5 py-0.5 rounded bg-black/15">
                        {isRec ? `${secondsLeft}s` : '30s'}
                      </span>
                    </button>
                    {participants.length > 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (recordingId === player.id) stopRecording();
                          onRemoveParticipant(player.id);
                        }}
                        aria-label={`Supprimer ${player.name || `Participant ${idx + 1}`}`}
                        className="w-10 h-11 rounded-xl border border-[#cbd5e1] dark:border-[#3f3f46] bg-[#f8fafc] dark:bg-[#18181b] text-[#64748b] hover:text-red-600 flex items-center justify-center shrink-0 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  rows={2}
                  value={player.plea}
                  aria-label={`Plaidoirie de ${player.name || `Participant ${idx + 1}`}`}
                  onChange={(e) => onUpdateParticipant(player.id, { plea: e.target.value })}
                  placeholder={`Arguments de ${player.name || `Participant ${idx + 1}`} (au micro ou au clavier)...`}
                  className="w-full p-3 rounded-xl border border-[#cbd5e1] dark:border-[#3f3f46] bg-[#f8fafc] dark:bg-[#09090b] text-sm font-medium placeholder:text-[#64748b]"
                />
              </div>
            );
          })}
        </div>

        {/* Choix du Juge & Action Principale */}
        <div className="rounded-2xl p-5 border-2 border-[#0f172a] dark:border-[#3f3f46] bg-white dark:bg-[#141418] space-y-4">
          <p className="text-xs font-extrabold text-[#334155] dark:text-[#d4d4d8]">
            Choisissez votre Juge
          </p>
          <div
            className="grid grid-cols-1 sm:grid-cols-3 gap-2.5"
            role="radiogroup"
            aria-label="Personnalité du juge"
          >
            {judgeOptions.map(({ key, icon }) => {
              const meta = JUDGE_META[key];
              const active = judge === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setJudge(key)}
                  className={`min-h-[68px] p-3.5 rounded-xl border-2 text-left flex sm:flex-col items-center sm:items-start gap-2.5 transition-colors ${
                    active
                      ? 'bg-[#0f172a] text-yellow-300 border-[#0f172a] dark:bg-yellow-400 dark:text-[#0f172a] dark:border-yellow-300 shadow-pop-sm'
                      : 'bg-[#f8fafc] dark:bg-[#18181b] text-[#0f172a] dark:text-[#e4e4e7] border-[#cbd5e1] dark:border-[#3f3f46] hover:border-[#0f172a]'
                  }`}
                >
                  <span className="shrink-0">{icon}</span>
                  <div>
                    <p className="font-extrabold text-sm leading-tight">{meta.shortLabel}</p>
                    <p className="text-xs opacity-80 mt-0.5">{meta.description}</p>
                  </div>
                </button>
              );
            })}
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

          <button
            type="button"
            disabled={isDeliberating}
            onClick={handleRenderVerdict}
            className="w-full min-h-[54px] rounded-xl border-2 border-[#0f172a] dark:border-red-400 bg-red-600 hover:bg-red-700 disabled:opacity-60 dark:bg-red-500 dark:hover:bg-red-400 text-white dark:text-[#0f172a] font-extrabold text-base inline-flex items-center justify-center gap-2.5 shadow-pop active:translate-y-0.5 transition-transform"
          >
            <Scale className="w-5 h-5" />
            <span>{isDeliberating ? 'Délibération en cours...' : 'Rendre le Verdict'}</span>
          </button>
        </div>
      </div>

      {/* Colonne droite : Arrêt du Tribunal */}
      <div className="lg:col-span-5 lg:sticky lg:top-[124px]">
        {verdict ? (
          <article
            ref={verdictCardRef}
            data-testid="verdict-card"
            className="scroll-mt-[124px] rounded-2xl p-5 sm:p-6 border-4 border-[#0f172a] dark:border-yellow-400 newsprint-bg shadow-pop space-y-4"
          >
            <div className="border-b-2 border-[#0f172a] dark:border-[#52525b] pb-3 flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs font-bold tracking-wider text-red-700 dark:text-red-400 tabular-nums">
                  {verdict.caseNumber}
                </p>
                <h3 className="font-serif text-2xl sm:text-3xl font-black tracking-tight mt-0.5">
                  Arrêt du Tribunal
                </h3>
              </div>
              <Scale className="w-7 h-7 text-[#0f172a] dark:text-yellow-400 shrink-0" />
            </div>

            <p className="text-xs font-bold text-[#475569] dark:text-[#a1a1aa]">
              {verdict.judgeLabel} · {verdict.source === 'gemini' ? 'IA Gemini' : 'Mode Démo'}
            </p>

            <p className="text-sm sm:text-base font-medium leading-relaxed whitespace-pre-line text-[#0f172a] dark:text-[#f4f4f5]">
              {verdict.reasoning}
            </p>

            <div className="p-4 rounded-xl border-2 border-red-800 bg-red-600 text-white dark:bg-red-500/20 dark:border-red-400 dark:text-red-100">
              <p className="text-xs font-extrabold tracking-wider opacity-95">
                Le Coupable Désigné
              </p>
              <p className="font-serif text-2xl font-black mt-1">{verdict.culprit}</p>
            </div>

            {verdict.compromise && (
              <div className="p-4 rounded-xl border-2 border-emerald-800 dark:border-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-100">
                <p className="text-xs font-extrabold tracking-wider inline-flex items-center gap-1.5">
                  <Handshake className="w-4 h-4 shrink-0" />
                  <span>Compromis Malin de la Cour</span>
                </p>
                <p className="font-semibold text-sm mt-1 leading-snug">{verdict.compromise}</p>
              </div>
            )}

            <div className="p-4 rounded-xl border-2 border-[#0f172a] dark:border-yellow-400 bg-yellow-300 text-[#0f172a] dark:bg-yellow-400/20 dark:text-yellow-100">
              <p className="text-xs font-extrabold tracking-wider">Gage Symbolique Absurde</p>
              <p className="font-bold text-sm sm:text-base mt-1 leading-snug">{verdict.forfeit}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#0f172a]/20 dark:border-[#3f3f46]">
              <button
                type="button"
                onClick={() =>
                  onSpeak(
                    `Arrêt du tribunal. ${verdict.reasoning}. Le coupable désigné est : ${verdict.culprit}. ${verdict.compromise ? `Compromis : ${verdict.compromise}. ` : ''}Gage symbolique : ${verdict.forfeit}`
                  )
                }
                className="flex-1 min-h-[46px] px-3.5 rounded-xl border-2 border-[#0f172a] dark:border-[#52525b] bg-white dark:bg-[#18181b] font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap"
              >
                <Volume2 className="w-4 h-4 shrink-0" />
                <span>Écouter le verdict</span>
              </button>
              <button
                type="button"
                onClick={onStopSpeech}
                aria-label="Arrêter la lecture du verdict"
                className="w-[46px] h-[46px] rounded-xl border-2 border-[#0f172a] dark:border-[#52525b] bg-white dark:bg-[#18181b] flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
              <button
                type="button"
                onClick={() => exportVerdictPNG(verdict, onNotify)}
                className="w-full min-h-[46px] px-4 rounded-xl border-2 border-[#0f172a] dark:border-yellow-400 bg-yellow-400 hover:bg-yellow-300 text-[#0f172a] font-extrabold text-sm inline-flex items-center justify-center gap-2 shadow-pop-sm transition-colors"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>Partager l’arrêt (PNG)</span>
              </button>
            </div>
          </article>
        ) : (
          <div className="rounded-2xl p-6 border-2 border-dashed border-[#cbd5e1] dark:border-[#3f3f46] newsprint-bg text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#0f172a] dark:bg-[#27272a] text-yellow-300 flex items-center justify-center mx-auto">
              <Gavel className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-xl font-black">Greffe en attente d’audience</h3>
            <p className="text-sm text-[#475569] dark:text-[#a1a1aa] max-w-xs mx-auto leading-relaxed">
              Ajoutez autant de participants que voulu, plaidez puis appuyez sur{' '}
              <strong className="text-[#0f172a] dark:text-white">Rendre le Verdict</strong> pour
              imprimer l’arrêt officiel.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
