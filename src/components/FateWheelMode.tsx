import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Flame, RotateCw, Sparkles, Users, Utensils } from 'lucide-react';
import type {
  DecisionOption,
  DecisionResult,
  GenerationMode,
  PlayerPlea,
} from '../types/bazar';
import {
  buildDemoDecisionVerdict,
  formatCaseNumber,
} from '../utils/bazarLogic';
import { playFanfare, playTick } from '../utils/soundEngine';
import { DecisionDecreeCard } from './DecisionDecreeCard';

interface FateWheelModeProps {
  mode: GenerationMode;
  simpleMode: boolean;
  participants: PlayerPlea[];
  topic: string;
  options: DecisionOption[];
  onTopicChange: (topic: string) => void;
  onSpeak: (text: string) => void;
  onStopSpeech: () => void;
  onNotify: (msg: string) => void;
  onSwitchToDemo: () => void;
}

const SLICE_PALETTE = [
  '#4338ca', // Indigo
  '#dc2626', // Rouge
  '#047857', // Émeraude
  '#d97706', // Ambre
  '#be185d', // Magenta
  '#0284c7', // Bleu
  '#7c3aed', // Violet
  '#0f766e', // Sarcelle
];

export const FateWheelMode: React.FC<FateWheelModeProps> = ({
  mode,
  simpleMode,
  participants,
  topic,
  options,
  onTopicChange,
  onSpeak,
  onStopSpeech,
  onNotify,
  onSwitchToDemo,
}) => {
  const [wheelSource, setWheelSource] = useState<'options' | 'participants'>('options');
  const [chaosMode, setChaosMode] = useState<boolean>(true);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [isGeneratingDecree, setIsGeneratingDecree] = useState<boolean>(false);
  const [decree, setDecree] = useState<DecisionResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rotationRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const decreeCardRef = useRef<HTMLElement | null>(null);

  const segments = useMemo(() => {
    const base =
      wheelSource === 'options'
        ? options.map((o) => o.label.trim()).filter(Boolean)
        : participants.map((p, i) => p.name.trim() || `Participant ${i + 1}`);
    const list = base.length >= 2 ? [...base] : ['Option A', 'Option B'];
    if (chaosMode) {
      list.push('JOKER DU JUGE');
    }
    return list;
  }, [wheelSource, options, participants, chaosMode]);

  const drawWheel = (angle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 14;
    const count = segments.length;
    const arc = (Math.PI * 2) / count;

    ctx.clearRect(0, 0, size, size);

    // Outer shadow ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 6, 0, Math.PI * 2);
    ctx.fillStyle = '#0F172A';
    ctx.fill();

    segments.forEach((label, i) => {
      const startAngle = angle + i * arc;
      const endAngle = startAngle + arc;
      const isJoker = chaosMode && i === count - 1;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = isJoker ? '#FACC15' : SLICE_PALETTE[i % SLICE_PALETTE.length];
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#0F172A';
      ctx.stroke();

      // Label (always right-side up)
      ctx.save();
      ctx.translate(cx, cy);
      const midAngle = startAngle + arc / 2;
      const normMid = ((midAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const isLeftHalf = normMid > Math.PI / 2 && normMid < (Math.PI * 3) / 2;
      ctx.rotate(isLeftHalf ? midAngle + Math.PI : midAngle);
      ctx.textAlign = isLeftHalf ? 'left' : 'right';
      ctx.fillStyle = isJoker ? '#0F172A' : '#FFFFFF';
      const fontSize = count > 8 ? 14 : count > 5 ? 16 : 18;
      ctx.font = `800 ${fontSize}px "Plus Jakarta Sans", sans-serif`;
      const trimmed = label.length > 19 ? `${label.slice(0, 18)}…` : label;
      ctx.fillText(trimmed, isLeftHalf ? -radius + 18 : radius - 18, 6);
      ctx.restore();
    });

    // Center hub
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.fillStyle = '#0F172A';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.fillStyle = '#FACC15';
    ctx.fill();

    // Top pointer triangle (at -PI/2)
    ctx.beginPath();
    ctx.moveTo(cx - 14, 4);
    ctx.lineTo(cx + 14, 4);
    ctx.lineTo(cx, 30);
    ctx.closePath();
    ctx.fillStyle = '#FACC15';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0F172A';
    ctx.stroke();
  };

  useEffect(() => {
    drawWheel(rotationRef.current);
  }, [segments]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  const finalizeSpin = async (winnerRaw: string) => {
    onStopSpeech();
    setApiError(null);
    setIsGeneratingDecree(true);

    const isJoker = winnerRaw === 'JOKER DU JUGE';
    const cleanTopic =
      wheelSource === 'participants'
        ? topic.trim() || 'Qui est désigné volontaire officiel ?'
        : topic.trim() || 'Le grand choix du jour';

    const winnerLabel = isJoker
      ? 'COUP DE THÉÂTRE : Le plus discret du groupe choisit librement !'
      : winnerRaw;
    const otherOpts = segments.filter((s) => s !== winnerRaw && s !== 'JOKER DU JUGE');

    try {
      let reasoning = '';
      let miniChallenge = '';
      let usedSource: GenerationMode = mode;

      if (mode === 'gemini') {
        const res = await fetch('/api/ai/commentary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modeTitle: wheelSource === 'participants' ? 'Roue des Participants' : 'Roue du Destin',
            topic: cleanTopic,
            winner: winnerLabel,
            participants: participants.map((p) => p.name),
            otherOptions: otherOpts,
          }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          setApiError(payload.error || 'Le Juge IA est indisponible.');
          const fallback = buildDemoDecisionVerdict({
            mode: 'wheel',
            topic: cleanTopic,
            winner: winnerLabel,
            optionsCount: segments.length,
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
          mode: 'wheel',
          topic: cleanTopic,
          winner: winnerLabel,
          optionsCount: segments.length,
        });
        reasoning = demo.reasoning;
        miniChallenge = demo.miniChallenge;
        usedSource = 'demo';
      }

      playFanfare();
      setDecree({
        caseNumber: formatCaseNumber(new Date().getFullYear()),
        mode: 'wheel',
        modeTitle: wheelSource === 'participants' ? 'Roue des Participants' : 'Roue du Destin',
        topic: cleanTopic,
        winner: winnerLabel,
        reasoning,
        miniChallenge,
        source: usedSource,
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

  const handleSpin = () => {
    if (isSpinning || segments.length < 2) return;
    setIsSpinning(true);
    setDecree(null);
    setApiError(null);

    const startAngle = rotationRef.current;
    const extraTurns = (5 + Math.random() * 3) * Math.PI * 2;
    const targetAngle = startAngle + extraTurns;
    const duration = 2600;
    const startTime = performance.now();
    const arc = (Math.PI * 2) / segments.length;
    let lastSliceIdx = -1;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      // Smooth quintic ease-out
      const easeOut = 1 - Math.pow(1 - t, 4);
      const current = startAngle + (targetAngle - startAngle) * easeOut;
      rotationRef.current = current;
      drawWheel(current);

      // Compute segment currently under top pointer (-PI/2)
      const normalized = (((-Math.PI / 2 - current) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const sliceIdx = Math.floor(normalized / arc) % segments.length;
      if (sliceIdx !== lastSliceIdx) {
        lastSliceIdx = sliceIdx;
        playTick();
      }

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        setIsSpinning(false);
        const winner = segments[sliceIdx] || segments[0];
        void finalizeSpin(winner);
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);
  };

  return (
    <section
      aria-labelledby="heading-wheel"
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
    >
      <div className="lg:col-span-7 space-y-5">
        <div className="rounded-2xl p-5 sm:p-6 border-2 border-[#0f172a] dark:border-amber-400/60 bg-[#fffbeb] dark:bg-[#141418] shadow-pop space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-extrabold tracking-wide text-amber-900 dark:text-amber-300">
              {wheelSource === 'options'
                ? `Roue des Propositions · ${segments.length} cases`
                : `Roue des Participants · ${segments.length} cases`}
            </p>
            <div
              className="inline-flex rounded-xl border-2 border-[#0f172a] dark:border-[#3f3f46] overflow-hidden bg-white dark:bg-[#09090b]"
              role="group"
              aria-label="Contenu de la roue"
            >
              <button
                type="button"
                onClick={() => {
                  setWheelSource('options');
                  setDecree(null);
                }}
                aria-pressed={wheelSource === 'options'}
                className={`min-h-[38px] px-3 font-extrabold text-xs inline-flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  wheelSource === 'options'
                    ? 'bg-[#0f172a] text-yellow-300 dark:bg-yellow-400 dark:text-[#0f172a]'
                    : 'text-[#0f172a] dark:text-[#d4d4d8]'
                }`}
              >
                <Utensils className="w-3.5 h-3.5" />
                <span>Propositions</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setWheelSource('participants');
                  setDecree(null);
                }}
                aria-pressed={wheelSource === 'participants'}
                className={`min-h-[38px] px-3 border-l-2 border-[#0f172a] dark:border-[#3f3f46] font-extrabold text-xs inline-flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  wheelSource === 'participants'
                    ? 'bg-[#0f172a] text-yellow-300 dark:bg-yellow-400 dark:text-[#0f172a]'
                    : 'text-[#0f172a] dark:text-[#d4d4d8]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Participants</span>
              </button>
            </div>
          </div>

          <div>
            <h2
              id="heading-wheel"
              className="font-serif text-2xl sm:text-3xl font-black tracking-tight leading-tight text-balance"
            >
              La Roue du Destin
            </h2>
            {!simpleMode && (
              <p className="text-sm text-[#334155] dark:text-[#a1a1aa] mt-1.5 leading-relaxed">
                Tirez au sort parmi toutes vos propositions… ou parmi tous les participants pour
                savoir qui paie la tournée ou choisit le resto !
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
            <input
              type="text"
              value={topic}
              aria-label="Sujet de la roue du destin"
              onChange={(e) => onTopicChange(e.target.value)}
              placeholder="Ex : Qui paie le dessert ce soir ?"
              className="flex-1 min-h-[46px] px-4 rounded-xl border-2 border-[#0f172a] dark:border-[#3f3f46] bg-white dark:bg-[#09090b] font-semibold text-sm sm:text-base placeholder:text-[#64748b]"
            />
            <button
              type="button"
              onClick={() => setChaosMode((prev) => !prev)}
              aria-pressed={chaosMode}
              className={`min-h-[46px] px-3.5 rounded-xl border-2 font-extrabold text-xs inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors ${
                chaosMode
                  ? 'border-[#0f172a] bg-yellow-400 text-[#0f172a]'
                  : 'border-[#cbd5e1] dark:border-[#3f3f46] bg-white dark:bg-[#18181b] text-[#475569] dark:text-[#a1a1aa]'
              }`}
            >
              <Flame className="w-4 h-4 shrink-0" />
              <span>Joker du Juge : {chaosMode ? 'ON' : 'OFF'}</span>
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

        {/* Canvas de la Roue */}
        <div className="rounded-2xl p-5 sm:p-6 border-2 border-[#0f172a] dark:border-[#3f3f46] bg-white dark:bg-[#141418] flex flex-col items-center gap-5">
          <div className="w-full max-w-[340px] aspect-square flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={420}
              height={420}
              data-testid="fate-wheel-canvas"
              data-spinning={isSpinning ? 'true' : 'false'}
              className="w-full h-full max-w-[340px] max-h-[340px]"
            />
          </div>

          <button
            type="button"
            disabled={isSpinning}
            data-testid="spin-wheel-btn"
            onClick={handleSpin}
            className="w-full min-h-[54px] rounded-xl border-2 border-[#0f172a] dark:border-yellow-400 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-60 text-[#0f172a] font-extrabold text-base inline-flex items-center justify-center gap-2.5 shadow-pop active:translate-y-0.5 transition-transform"
          >
            {isSpinning ? (
              <RotateCw className="w-5 h-5 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
            <span>{isSpinning ? 'La roue tourne…' : 'Lancer la Roue du Destin !'}</span>
          </button>
        </div>
      </div>

      {/* Colonne droite : Décret */}
      <div className="lg:col-span-5 lg:sticky lg:top-[124px]">
        <DecisionDecreeCard
          decree={decree}
          cardRef={decreeCardRef}
          emptyTitle={isGeneratingDecree ? 'Le Juge valide le tirage…' : 'Prêt à tourner !'}
          emptyDescription="Appuyez sur « Lancer la Roue du Destin » pour trancher instantanément entre vos options ou vos participants."
          onSpeak={onSpeak}
          onStopSpeech={onStopSpeech}
          onNotify={onNotify}
        />
      </div>
    </section>
  );
};
