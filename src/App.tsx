import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Ban, Disc3, Hash, Scale, Sliders } from 'lucide-react';
import { AlphabetteHeader } from './components/AlphabetteHeader';
import { FateWheelMode } from './components/FateWheelMode';
import { MysteryNumberMode } from './components/MysteryNumberMode';
import { ParticipantBar } from './components/ParticipantBar';
import { TribunalTab } from './components/TribunalTab';
import { VetoCascadeMode } from './components/VetoCascadeMode';
import { VoiceEngineModal } from './components/VoiceEngineModal';
import type { AppModeKey, BazarSettings, DecisionOption, PlayerPlea } from './types/bazar';
import {
  ABSURD_SUBJECTS,
  createParticipantId,
  getSuggestedParticipantName,
  makeOptionsFromLabels,
  OPTION_PRESETS,
} from './utils/bazarLogic';

const STORAGE_SETTINGS = 'tribunal_choix_settings_v3';

const DEFAULT_SETTINGS: BazarSettings = {
  theme: 'light',
  mode: 'demo',
  modeExplicitlySet: false,
  ttsSpeed: 1.05,
  bigMode: false,
  simpleMode: false,
  pinned: false,
  language: 'FR',
};

function loadInitialSettings(): BazarSettings {
  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export default function App() {
  const [settings, setSettings] = useState<BazarSettings>(loadInitialSettings);
  const [activeMode, setActiveMode] = useState<AppModeKey>('tribunal');
  const [aiAvailable, setAiAvailable] = useState<boolean>(false);
  const [studioModalOpen, setStudioModalOpen] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Shared unlimited participants roster across all 4 modes
  const [participants, setParticipants] = useState<PlayerPlea[]>([
    { id: 'p-1', name: 'Camille', plea: '' },
    { id: 'p-2', name: 'Julien', plea: '' },
  ]);

  // Shared tribunal dispute subject & shared decision options pool
  const [tribunalSubject, setTribunalSubject] = useState<string>(ABSURD_SUBJECTS[0]);
  const [decisionTopic, setDecisionTopic] = useState<string>(OPTION_PRESETS[0].topic);
  const [options, setOptions] = useState<DecisionOption[]>(() =>
    makeOptionsFromLabels(OPTION_PRESETS[0].options)
  );

  const mainRef = useRef<HTMLElement>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  }, []);

  useEffect(() => {
    const isDark = settings.theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isDark ? '#09090B' : '#FFFFFF');
    }
    try {
      localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(settings));
    } catch {
      // Ignore storage errors
    }
  }, [settings]);

  // Auto-detect server-side Gemini AI availability and activate it by default if available
  useEffect(() => {
    let mounted = true;
    fetch('/api/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!mounted || !data) return;
        const available = Boolean(data.aiAvailable);
        setAiAvailable(available);
        if (available) {
          setSettings((prev) =>
            prev.modeExplicitlySet ? prev : { ...prev, mode: 'gemini' }
          );
        }
      })
      .catch(() => {
        if (mounted) setAiAvailable(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const stopSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const speakText = useCallback(
    (text: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        showToast('Synthèse vocale non supportée sur ce navigateur.');
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang =
        settings.language === 'EN' ? 'en-US' : settings.language === 'ES' ? 'es-ES' : 'fr-FR';
      utterance.rate = settings.ttsSpeed || 1.05;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    },
    [settings.language, settings.ttsSpeed, showToast]
  );

  const handleToggleHeaderSpeech = useCallback(() => {
    if (isSpeaking) {
      stopSpeech();
      return;
    }
    const content = mainRef.current?.innerText?.trim();
    if (!content) {
      showToast('Aucun texte à lire sur cette page.');
      return;
    }
    speakText(content.slice(0, 2000));
  }, [isSpeaking, speakText, stopSpeech, showToast]);

  const updateSettings = (patch: Partial<BazarSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const handleAddParticipant = (rawName?: string) => {
    const clean = (rawName || '').trim();
    const finalName =
      clean || getSuggestedParticipantName(participants.map((p) => p.name));
    setParticipants((prev) => [
      ...prev,
      { id: createParticipantId(), name: finalName, plea: '' },
    ]);
    showToast(`${finalName} rejoint la table !`);
  };

  const handleRemoveParticipant = (id: string) => {
    if (participants.length <= 2) {
      showToast('Il faut au moins 2 participants autour de la table.');
      return;
    }
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  };

  const handleUpdateParticipant = (
    id: string,
    patch: Partial<Pick<PlayerPlea, 'name' | 'plea'>>
  ) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
    );
  };

  const handleTogglePin = () => {
    setSettings((prev) => {
      const next = !prev.pinned;
      showToast(
        next ? 'Le Tribunal des Choix épinglé dans vos favoris !' : 'Épingle retirée.'
      );
      return { ...prev, pinned: next };
    });
  };

  const handleToggleSimpleMode = () => {
    setSettings((prev) => {
      const nextSimple = !prev.simpleMode;
      showToast(
        nextSimple
          ? 'Mode simple activé : affichage allégé et texte agrandi.'
          : 'Mode simple désactivé.'
      );
      return {
        ...prev,
        simpleMode: nextSimple,
        bigMode: nextSimple ? true : prev.bigMode,
      };
    });
  };

  const modes: Array<{ key: AppModeKey; label: string; icon: React.ReactNode }> = [
    { key: 'tribunal', label: 'Tribunal IA', icon: <Scale className="w-4 h-4 shrink-0" /> },
    { key: 'mystery', label: 'Chiffre Mystère', icon: <Hash className="w-4 h-4 shrink-0" /> },
    { key: 'veto', label: 'Veto Cascade', icon: <Ban className="w-4 h-4 shrink-0" /> },
    { key: 'wheel', label: 'Roue Destin', icon: <Disc3 className="w-4 h-4 shrink-0" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A] dark:bg-[#09090B] dark:text-[#FAFAFA]">
      {/* DOUBLE BARRE ALPHABETTE FIXE */}
      <AlphabetteHeader
        settings={settings}
        isSpeaking={isSpeaking}
        onResetHome={() => {
          setActiveMode('tribunal');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onToggleBigMode={() =>
          setSettings((prev) => {
            const next = !prev.bigMode;
            showToast(
              next ? 'Mode grand texte BIG activé.' : 'Taille de texte standard rétablie.'
            );
            return { ...prev, bigMode: next };
          })
        }
        onToggleTheme={() =>
          setSettings((prev) => ({
            ...prev,
            theme: prev.theme === 'dark' ? 'light' : 'dark',
          }))
        }
        onToggleSpeech={handleToggleHeaderSpeech}
        onTogglePin={handleTogglePin}
        onToggleSimpleMode={handleToggleSimpleMode}
        onChangeLanguage={(lang) => updateSettings({ language: lang })}
        onNotify={showToast}
      />

      {/* CONTENU PRINCIPAL : LE TRIBUNAL DES CHOIX */}
      <main
        ref={mainRef}
        className={`flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-12 ${
          settings.bigMode ? 'bazar-content-big' : 'bazar-content-normal'
        }`}
      >
        {/* Barre utilitaire discrète + Réglages IA / Voix */}
        <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-[#e2e8f0] dark:border-[#27272a] no-print">
          <span className="text-[12px] sm:text-xs font-semibold text-[#64748b] dark:text-[#a1a1aa] truncate">
            <strong className="text-[#0f172a] dark:text-white">
              {settings.mode === 'gemini' ? 'IA Gemini active' : 'Mode Démo'}
            </strong>{' '}
            · {participants.length} participants
            <span className="hidden sm:inline"> · Voix {settings.ttsSpeed.toFixed(2)}x</span>
          </span>
          <button
            type="button"
            onClick={() => setStudioModalOpen(true)}
            aria-label="Ouvrir les réglages IA et voix"
            className="min-h-[40px] px-3.5 rounded-xl border border-[#cbd5e1] dark:border-[#3f3f46] bg-white dark:bg-[#141418] hover:bg-[#f1f5f9] dark:hover:bg-[#1e1e24] font-bold text-xs inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors"
          >
            <Sliders className="w-4 h-4 shrink-0" />
            <span>Réglages IA</span>
          </button>
        </div>

        {/* Sélecteur des 4 modes fun pour trancher ensemble */}
        <nav
          aria-label="Modes de décision"
          className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5 no-print"
          role="tablist"
        >
          {modes.map((m) => {
            const active = activeMode === m.key;
            return (
              <button
                key={m.key}
                type="button"
                role="tab"
                aria-selected={active}
                data-testid={`mode-tab-${m.key}`}
                onClick={() => {
                  stopSpeech();
                  setActiveMode(m.key);
                }}
                className={`min-h-[46px] px-3 rounded-xl border-2 font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-[#0f172a] text-yellow-300 border-[#0f172a] dark:bg-yellow-400 dark:text-[#0f172a] dark:border-yellow-400 shadow-pop-sm'
                    : 'bg-white dark:bg-[#141418] text-[#0f172a] dark:text-[#e4e4e7] border-[#cbd5e1] dark:border-[#3f3f46] hover:border-[#0f172a]'
                }`}
              >
                {m.icon}
                <span>{m.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Table partagée des participants (nombre infini) */}
        <ParticipantBar
          participants={participants}
          onAddParticipant={handleAddParticipant}
          onRemoveParticipant={handleRemoveParticipant}
        />

        {/* Vue active */}
        {activeMode === 'tribunal' && (
          <TribunalTab
            mode={settings.mode}
            simpleMode={settings.simpleMode}
            participants={participants}
            subject={tribunalSubject}
            onSubjectChange={setTribunalSubject}
            onUpdateParticipant={handleUpdateParticipant}
            onAddParticipant={handleAddParticipant}
            onRemoveParticipant={handleRemoveParticipant}
            onSpeak={speakText}
            onStopSpeech={stopSpeech}
            onNotify={showToast}
            onSwitchToDemo={() => {
              updateSettings({ mode: 'demo', modeExplicitlySet: true });
              showToast('Mode Démo Hors-Ligne activé.');
            }}
          />
        )}

        {activeMode === 'mystery' && (
          <MysteryNumberMode
            mode={settings.mode}
            simpleMode={settings.simpleMode}
            participants={participants}
            topic={decisionTopic}
            options={options}
            onTopicChange={setDecisionTopic}
            onOptionsChange={setOptions}
            onSpeak={speakText}
            onStopSpeech={stopSpeech}
            onNotify={showToast}
            onSwitchToDemo={() => {
              updateSettings({ mode: 'demo', modeExplicitlySet: true });
              showToast('Mode Démo Hors-Ligne activé.');
            }}
          />
        )}

        {activeMode === 'veto' && (
          <VetoCascadeMode
            mode={settings.mode}
            simpleMode={settings.simpleMode}
            participants={participants}
            topic={decisionTopic}
            options={options}
            onTopicChange={setDecisionTopic}
            onOptionsChange={setOptions}
            onSpeak={speakText}
            onStopSpeech={stopSpeech}
            onNotify={showToast}
            onSwitchToDemo={() => {
              updateSettings({ mode: 'demo', modeExplicitlySet: true });
              showToast('Mode Démo Hors-Ligne activé.');
            }}
          />
        )}

        {activeMode === 'wheel' && (
          <FateWheelMode
            mode={settings.mode}
            simpleMode={settings.simpleMode}
            participants={participants}
            topic={decisionTopic}
            options={options}
            onTopicChange={setDecisionTopic}
            onSpeak={speakText}
            onStopSpeech={stopSpeech}
            onNotify={showToast}
            onSwitchToDemo={() => {
              updateSettings({ mode: 'demo', modeExplicitlySet: true });
              showToast('Mode Démo Hors-Ligne activé.');
            }}
          />
        )}
      </main>

      {/* MODALE RÉGLAGES (Moteur IA & Vitesse Voix) */}
      <VoiceEngineModal
        isOpen={studioModalOpen}
        settings={settings}
        aiAvailable={aiAvailable}
        onClose={() => setStudioModalOpen(false)}
        onUpdate={(patch) => {
          updateSettings({
            ...patch,
            ...(patch.mode ? { modeExplicitlySet: true } : {}),
          });
          showToast('Réglages mis à jour.');
        }}
      />

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 left-1/2 -translate-x-1/2 md:bottom-auto md:top-[120px] md:left-auto md:right-6 md:translate-x-0 z-50 px-4 py-2.5 rounded-xl bg-[#0f172a] dark:bg-yellow-400 text-white dark:text-[#0f172a] font-bold text-xs sm:text-sm shadow-xl border-2 border-yellow-400 dark:border-[#0f172a] text-center max-w-[90vw] md:max-w-sm no-print"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
