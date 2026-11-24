import React, { useEffect, useRef, useState } from 'react';
import {
  BarChart2,
  Crown,
  Globe,
  Heart,
  LayoutGrid,
  MessageSquare,
  Moon,
  MoreHorizontal,
  Printer,
  Smartphone,
  Sparkles,
  Star,
  Sun,
  User,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { ALPHABETTE_SUITE_APPS } from '../utils/bazarLogic';
import type { BazarSettings } from '../types/bazar';

const FAVORITES_KEY = 'alphabette_favorites_v1';

interface AlphabetteHeaderProps {
  settings: BazarSettings;
  isSpeaking: boolean;
  onResetHome: () => void;
  onToggleBigMode: () => void;
  onToggleTheme: () => void;
  onToggleSpeech: () => void;
  onTogglePin: () => void;
  onToggleSimpleMode: () => void;
  onChangeLanguage: (lang: 'FR' | 'EN' | 'ES') => void;
  onNotify: (msg: string) => void;
}

type ActiveModal =
  | null
  | 'apps'
  | 'news'
  | 'subscription'
  | 'donate'
  | 'install'
  | 'feedback'
  | 'language';

export const AlphabetteHeader: React.FC<AlphabetteHeaderProps> = ({
  settings,
  isSpeaking,
  onResetHome,
  onToggleBigMode,
  onToggleTheme,
  onToggleSpeech,
  onTogglePin,
  onToggleSimpleMode,
  onChangeLanguage,
  onNotify,
}) => {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(FAVORITES_KEY) || '["le-tribunal-des-choix"]'
      );
      return Array.isArray(saved) ? saved : ['le-tribunal-des-choix'];
    } catch {
      return ['le-tribunal-des-choix'];
    }
  });

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch {
      // Ignore storage quota issues
    }
  }, [favorites]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!activeModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveModal(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeModal]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) {
      onNotify('Écrivez quelques mots avant d’envoyer votre avis.');
      return;
    }
    setFeedbackText('');
    setActiveModal(null);
    onNotify('Merci pour votre retour ! L’équipe Alphabette l’a bien noté.');
  };

  const isDark = settings.theme === 'dark';
  const newApps = ALPHABETTE_SUITE_APPS.filter((a) => a.isNew);

  return (
    <>
      <header className="sticky top-0 z-40 w-full no-print">
        {/* 1. BARRE SUPÉRIEURE (Top Bar Écosystème — dimensions strictement en px) */}
        <div
          className="w-full bg-[#182334] dark:bg-[#0b1220] text-white flex items-center justify-between flex-nowrap px-[8px] sm:px-[16px] h-[46px] sm:h-[50px] gap-[6px]"
          style={{ fontSize: '14px' }}
        >
          {/* Bloc de gauche */}
          <div className="flex items-center flex-nowrap gap-[5px] sm:gap-[10px] min-w-0">
            <a
              href="https://alphabette.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-[5px] sm:gap-[8px] shrink-0 hover:opacity-90 transition-opacity rounded-[8px] py-[2px]"
              aria-label="Accéder au portail alphabette.fr"
            >
              <span className="w-[24px] h-[24px] sm:w-[28px] sm:h-[28px] rounded-full bg-[#3355d1] text-white font-extrabold flex items-center justify-center leading-none text-[14px] sm:text-[16px] shrink-0">
                a
              </span>
              <span className="font-bold lowercase tracking-tight text-white text-[14px] sm:text-[17px] leading-none whitespace-nowrap">
                alphabette
              </span>
            </a>

            <a
              href="https://alphabette.eu"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Laboratoire alphabette.eu"
              className="w-[34px] h-[34px] sm:w-[36px] sm:h-[36px] rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold text-[12px] sm:text-[13px] flex items-center justify-center shrink-0 transition-colors"
            >
              .eu
            </a>

            <button
              type="button"
              onClick={() => setActiveModal('apps')}
              aria-label="Toutes les applis de la suite Alphabette"
              className="h-[34px] w-[34px] sm:w-auto sm:h-[36px] sm:px-[10px] rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center gap-[6px] shrink-0 transition-colors"
            >
              <LayoutGrid className="w-[17px] h-[17px] shrink-0" />
              <span className="hidden sm:inline text-[12.5px] font-semibold whitespace-nowrap">
                Toutes les applis
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveModal('news')}
              aria-label="Nouveautés Alphabette"
              className="w-[34px] h-[34px] sm:w-[36px] sm:h-[36px] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0 transition-colors"
            >
              <span className="rounded-[4px] bg-gradient-to-b from-sky-200 to-sky-400 text-[#0f172a] font-extrabold uppercase text-[9px] leading-none px-[4px] py-[2px] tracking-tight">
                NEW
              </span>
            </button>
          </div>

          {/* Bloc de droite : Bouton Abonnement doré */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setActiveModal('subscription')}
              className="h-[34px] sm:h-[36px] px-[9px] sm:px-[14px] rounded-full bg-white/10 hover:bg-white/15 border-[1.5px] border-[#f59e0b] text-[#fbbf24] flex items-center justify-center gap-[5px] font-bold text-[12px] sm:text-[13.5px] whitespace-nowrap transition-colors"
            >
              <Crown className="w-[13px] h-[13px] sm:w-[14px] sm:h-[14px] text-[#f59e0b] shrink-0" />
              <span>Abonnement</span>
            </button>
          </div>
        </div>

        {/* 2. BARRE INFÉRIEURE (Barre d'Application & Accessibilité — dimensions strictement en px) */}
        <div
          className="w-full bg-white dark:bg-[#0f172a] border-b border-[#e2e8f0] dark:border-[#334155] flex items-center justify-between flex-nowrap px-[8px] min-[390px]:px-[10px] sm:px-[16px] h-[54px] sm:h-[58px] gap-[4px] sm:gap-[6px] transition-colors"
          style={{ fontSize: '14px' }}
        >
          {/* Bloc de gauche : Titre + sous-titre */}
          <button
            type="button"
            onClick={onResetHome}
            className="min-w-0 flex-1 text-left flex flex-col justify-center rounded-[8px] py-[2px] focus-visible:outline-offset-2"
            aria-label="Revenir à l'accueil de Le Tribunal des Choix"
          >
            <div className="flex items-center gap-[4px] sm:gap-[5px] min-w-0">
              <span
                data-testid="app-header-title"
                className="font-extrabold text-[#3f51b5] dark:text-white tracking-tight text-[13px] min-[390px]:text-[14.5px] sm:text-[20px] leading-[1.15] truncate"
              >
                Le Tribunal des Choix
              </span>
              {settings.pinned && (
                <Star
                  className="w-[12px] h-[12px] sm:w-[13px] sm:h-[13px] text-[#f59e0b] fill-[#f59e0b] shrink-0"
                  aria-label="Application épinglée"
                />
              )}
            </div>
            <span className="text-[9px] sm:text-[10.5px] font-bold uppercase tracking-[0.04em] text-[#64748b] dark:text-[#94a3b8] leading-[1.2] truncate">
              TRIBUNAL SATIRIQUE
            </span>
          </button>

          {/* Bloc de droite : Exactement les 5 boutons d'accessibilité & actions */}
          <div className="flex items-center flex-nowrap gap-[3px] min-[390px]:gap-[4px] sm:gap-[7px] shrink-0">
            {/* 1. Bouton Don */}
            <button
              type="button"
              onClick={() => setActiveModal('donate')}
              aria-label="Soutenir Alphabette par un don"
              className="w-[32px] h-[32px] min-[390px]:w-[34px] min-[390px]:h-[34px] sm:w-[38px] sm:h-[38px] rounded-[9px] sm:rounded-[11px] bg-[#db2777] hover:bg-[#be185d] text-white flex items-center justify-center shrink-0 transition-colors"
            >
              <Heart className="w-[16px] h-[16px] sm:w-[18px] sm:h-[18px] fill-white text-white" />
            </button>

            {/* 2. Bouton BIG */}
            <button
              type="button"
              onClick={onToggleBigMode}
              aria-pressed={settings.bigMode}
              aria-label="Activer ou désactiver le mode grand texte BIG"
              className={`h-[32px] min-[390px]:h-[34px] sm:h-[38px] px-[6px] min-[390px]:px-[8px] sm:px-[11px] rounded-[9px] sm:rounded-[11px] flex items-center justify-center gap-[3px] sm:gap-[4px] font-extrabold text-[11.5px] min-[390px]:text-[12px] sm:text-[14px] text-white shrink-0 transition-colors ${
                settings.bigMode
                  ? 'bg-[#312e81] ring-2 ring-[#818cf8]'
                  : 'bg-[#4338ca] hover:bg-[#3730a3]'
              }`}
            >
              <span>BIG</span>
              <BarChart2 className="w-[13px] h-[13px] sm:w-[15px] sm:h-[15px] shrink-0" />
            </button>

            {/* 3. Bouton Mode Nuit / Jour */}
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isDark ? 'Passer en mode jour' : 'Passer en mode nuit'}
              className="w-[32px] h-[32px] min-[390px]:w-[34px] min-[390px]:h-[34px] sm:w-[38px] sm:h-[38px] rounded-full bg-[#f1f5f9] dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] hover:bg-[#e2e8f0] dark:hover:bg-[#334155] flex items-center justify-center shrink-0 transition-colors"
            >
              {isDark ? (
                <Sun className="w-[16px] h-[16px] sm:w-[17px] sm:h-[17px] text-[#fbbf24]" />
              ) : (
                <Moon className="w-[16px] h-[16px] sm:w-[17px] sm:h-[17px] text-[#334155]" />
              )}
            </button>

            {/* 4. Bouton Lecture à haute voix */}
            <button
              type="button"
              onClick={onToggleSpeech}
              aria-pressed={isSpeaking}
              aria-label={
                isSpeaking ? 'Arrêter la lecture à haute voix' : 'Lire la page à haute voix'
              }
              className={`w-[32px] h-[32px] min-[390px]:w-[34px] min-[390px]:h-[34px] sm:w-[38px] sm:h-[38px] rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                isSpeaking
                  ? 'bg-[#047857] border-[#047857] text-white'
                  : 'bg-[#f1f5f9] dark:bg-[#1e293b] border-[#e2e8f0] dark:border-[#334155] text-[#334155] dark:text-[#e2e8f0] hover:bg-[#e2e8f0] dark:hover:bg-[#334155]'
              }`}
            >
              {isSpeaking ? (
                <VolumeX className="w-[16px] h-[16px] sm:w-[17px] sm:h-[17px]" />
              ) : (
                <Volume2 className="w-[16px] h-[16px] sm:w-[17px] sm:h-[17px]" />
              )}
            </button>

            {/* 5. Bouton Plus d'options (...) */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-label="Plus d'options"
                className="w-[32px] h-[32px] min-[390px]:w-[34px] min-[390px]:h-[34px] sm:w-[38px] sm:h-[38px] rounded-full bg-[#f1f5f9] dark:bg-[#1e293b] border border-[#e2e8f0] dark:border-[#334155] text-[#334155] dark:text-[#e2e8f0] hover:bg-[#e2e8f0] dark:hover:bg-[#334155] flex items-center justify-center shrink-0 transition-colors"
              >
                <MoreHorizontal className="w-[17px] h-[17px] sm:w-[18px] sm:h-[18px]" />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  aria-label="Menu d'options de l'application"
                  className="absolute right-0 mt-[8px] w-[260px] rounded-[14px] bg-white dark:bg-[#0f172a] border border-[#e2e8f0] dark:border-[#334155] shadow-xl py-[6px] z-50 text-[#0f172a] dark:text-[#f8fafc]"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onTogglePin();
                      setMenuOpen(false);
                    }}
                    className="w-full px-[14px] py-[10px] text-left text-[14px] font-semibold flex items-center justify-between hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] transition-colors"
                  >
                    <span className="flex items-center gap-[10px]">
                      <Star
                        className={`w-[16px] h-[16px] ${
                          settings.pinned ? 'text-[#f59e0b] fill-[#f59e0b]' : 'text-[#f59e0b]'
                        }`}
                      />
                      <span>Épingler cette appli</span>
                    </span>
                    {settings.pinned && (
                      <span className="text-[11px] font-bold text-[#4338ca] dark:text-[#818cf8]">
                        Actif
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setActiveModal('subscription');
                    }}
                    className="w-full px-[14px] py-[10px] text-left text-[14px] font-semibold flex items-center gap-[10px] hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] transition-colors"
                  >
                    <User className="w-[16px] h-[16px] text-[#3f51b5] dark:text-[#818cf8]" />
                    <span>Mon inscription</span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onToggleSimpleMode();
                      setMenuOpen(false);
                    }}
                    className="w-full px-[14px] py-[10px] text-left text-[14px] font-semibold flex items-center justify-between hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] transition-colors"
                  >
                    <span className="flex items-center gap-[10px]">
                      <Sparkles className="w-[16px] h-[16px] text-[#10b981]" />
                      <span>Mode simple</span>
                    </span>
                    {settings.simpleMode && (
                      <span className="text-[11px] font-bold text-[#059669] dark:text-[#34d399]">
                        Actif
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setActiveModal('install');
                    }}
                    className="w-full px-[14px] py-[10px] text-left text-[14px] font-semibold flex items-center gap-[10px] hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] transition-colors"
                  >
                    <Smartphone className="w-[16px] h-[16px] text-[#0284c7] dark:text-[#38bdf8]" />
                    <span>Installer sur mon téléphone</span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setActiveModal('feedback');
                    }}
                    className="w-full px-[14px] py-[10px] text-left text-[14px] font-semibold flex items-center gap-[10px] hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] transition-colors"
                  >
                    <MessageSquare className="w-[16px] h-[16px] text-[#db2777]" />
                    <span>Donner mon avis</span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      window.print();
                    }}
                    className="w-full px-[14px] py-[10px] text-left text-[14px] font-semibold flex items-center gap-[10px] hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] transition-colors"
                  >
                    <Printer className="w-[16px] h-[16px] text-[#64748b] dark:text-[#94a3b8]" />
                    <span>Imprimer</span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setActiveModal('language');
                    }}
                    className="w-full px-[14px] py-[10px] text-left text-[14px] font-semibold flex items-center justify-between hover:bg-[#f1f5f9] dark:hover:bg-[#1e293b] transition-colors"
                  >
                    <span className="flex items-center gap-[10px]">
                      <Globe className="w-[16px] h-[16px] text-[#0f766e] dark:text-[#2dd4bf]" />
                      <span>Langue</span>
                    </span>
                    <span className="text-[12px] font-bold text-[#64748b] dark:text-[#94a3b8]">
                      {settings.language}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ==================== MODALES AUTONOMES DOUBLE BARRE ==================== */}
      {activeModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-4 no-print"
          role="dialog"
          aria-modal="true"
          aria-labelledby="alphabette-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal(null);
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#141418] border-2 border-[#0f172a] dark:border-[#3f3f46] p-5 sm:p-6 shadow-2xl space-y-4 text-[#0f172a] dark:text-[#fafafa]">
            <div className="flex items-center justify-between gap-3">
              <h2 id="alphabette-modal-title" className="font-serif text-xl sm:text-2xl font-black">
                {activeModal === 'apps' && 'Toutes les applis Alphabette'}
                {activeModal === 'news' && 'Nouveautés de la suite'}
                {activeModal === 'subscription' && 'Abonnement Alphabette'}
                {activeModal === 'donate' && 'Soutenir Alphabette'}
                {activeModal === 'install' && 'Installer sur mon téléphone'}
                {activeModal === 'feedback' && 'Donner mon avis'}
                {activeModal === 'language' && 'Choisir la langue'}
              </h2>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Fermer la fenêtre"
                className="w-10 h-10 rounded-xl border border-[#cbd5e1] dark:border-[#3f3f46] bg-[#f8fafc] dark:bg-[#1e1e24] flex items-center justify-center hover:bg-[#e2e8f0] dark:hover:bg-[#27272a] transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modale : Toutes les applis */}
            {activeModal === 'apps' && (
              <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                {ALPHABETTE_SUITE_APPS.map((app) => {
                  const isFav = favorites.includes(app.id);
                  return (
                    <div
                      key={app.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[#e2e8f0] dark:border-[#27272a] bg-[#f8fafc] dark:bg-[#18181b]"
                    >
                      <a
                        href={app.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-w-0 flex-1 hover:underline"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{app.name}</span>
                          {app.isCurrent && (
                            <span className="text-xs font-semibold text-[#3f51b5] dark:text-[#818cf8]">
                              · Ouverte
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#64748b] dark:text-[#a1a1aa] line-clamp-1 mt-0.5">
                          {app.tagline}
                        </p>
                      </a>
                      <button
                        type="button"
                        onClick={() => toggleFavorite(app.id)}
                        aria-label={
                          isFav
                            ? `Retirer ${app.name} des favoris`
                            : `Ajouter ${app.name} aux favoris`
                        }
                        className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-[#e2e8f0] dark:hover:bg-[#27272a] transition-colors shrink-0"
                      >
                        <Star
                          className={`w-5 h-5 ${
                            isFav
                              ? 'text-[#f59e0b] fill-[#f59e0b]'
                              : 'text-[#94a3b8] dark:text-[#71717a]'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Modale : Nouveautés */}
            {activeModal === 'news' && (
              <div className="space-y-3">
                <p className="text-sm text-[#475569] dark:text-[#a1a1aa]">
                  Découvrez les dernières applications ajoutées au laboratoire Alphabette.
                </p>
                {newApps.map((app) => {
                  const isFav = favorites.includes(app.id);
                  return (
                    <div
                      key={app.id}
                      className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-[#e2e8f0] dark:border-[#27272a] bg-[#f8fafc] dark:bg-[#18181b]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm">{app.name}</p>
                        <p className="text-xs text-[#64748b] dark:text-[#a1a1aa] mt-0.5">
                          {app.tagline}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleFavorite(app.id)}
                        aria-label={
                          isFav
                            ? `Retirer ${app.name} des favoris`
                            : `Ajouter ${app.name} aux favoris`
                        }
                        className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-[#e2e8f0] dark:hover:bg-[#27272a] transition-colors shrink-0"
                      >
                        <Star
                          className={`w-5 h-5 ${
                            isFav
                              ? 'text-[#f59e0b] fill-[#f59e0b]'
                              : 'text-[#94a3b8] dark:text-[#71717a]'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Modale : Abonnement */}
            {activeModal === 'subscription' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/40 space-y-2">
                  <p className="text-sm font-bold text-amber-950 dark:text-amber-200">
                    Lancement de l’abonnement payant le 7 mai
                  </p>
                  <p className="text-sm text-amber-900 dark:text-amber-100/90 leading-relaxed">
                    Accès complet sans publicité, synchronisation multi-appareils et sauvegarde de
                    vos créations sur toute la suite Alphabette.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl border border-[#e2e8f0] dark:border-[#27272a] bg-[#f8fafc] dark:bg-[#18181b]">
                    <p className="text-xs font-bold text-[#64748b] dark:text-[#a1a1aa]">
                      Formule Essentielle
                    </p>
                    <p className="font-serif text-2xl font-black mt-1 tabular-nums">15 € / an</p>
                    <p className="text-xs text-[#475569] dark:text-[#a1a1aa] mt-1">
                      Pour une application au choix
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border-2 border-[#f59e0b] bg-amber-50/50 dark:bg-amber-500/10">
                    <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                      Pass Intégral Suite
                    </p>
                    <p className="font-serif text-2xl font-black mt-1 tabular-nums">40 € / an</p>
                    <p className="text-xs text-[#475569] dark:text-[#d4d4d8] mt-1">
                      Pour toutes les applis Alphabette
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Modale : Don / Soutien */}
            {activeModal === 'donate' && (
              <div className="space-y-4">
                <p className="text-sm text-[#475569] dark:text-[#d4d4d8] leading-relaxed">
                  Alphabette est conçu en indépendant, sans traceurs publicitaires ni revente de
                  données. Votre soutien aide à maintenir l’hébergement et à créer de nouveaux outils
                  accessibles.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {['3 €', '5 €', '10 €'].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => {
                        setActiveModal(null);
                        onNotify(`Merci pour votre soutien envisagé (${amount}) !`);
                      }}
                      className="min-h-[44px] rounded-xl border-2 border-[#db2777] text-[#db2777] dark:text-pink-300 font-bold text-sm hover:bg-[#db2777] hover:text-white transition-colors tabular-nums"
                    >
                      {amount}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Modale : Installer sur mon téléphone */}
            {activeModal === 'install' && (
              <div className="space-y-3 text-sm text-[#334155] dark:text-[#d4d4d8]">
                <p className="leading-relaxed">
                  Ajoutez <strong>Le Tribunal des Choix</strong> sur votre écran d’accueil pour
                  l’ouvrir en plein écran comme une application native :
                </p>
                <ol className="list-decimal list-inside space-y-2">
                  <li>
                    <strong>Sur Android (Chrome)</strong> : appuyez sur le menu ⋮ en haut à droite
                    puis choisissez <em>Ajouter à l’écran d’accueil</em>.
                  </li>
                  <li>
                    <strong>Sur iPhone / iPad (Safari)</strong> : appuyez sur le bouton Partager en
                    bas puis sur <em>Sur l’écran d’accueil</em>.
                  </li>
                </ol>
              </div>
            )}

            {/* Modale : Donner mon avis */}
            {activeModal === 'feedback' && (
              <form onSubmit={handleFeedbackSubmit} className="space-y-3">
                <label htmlFor="alphabette-feedback-input" className="block text-sm font-semibold">
                  Une idée de sujet absurde, un bug ou une suggestion ?
                </label>
                <textarea
                  id="alphabette-feedback-input"
                  rows={3}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Écrivez votre retour ici..."
                  className="w-full p-3 rounded-xl border border-[#cbd5e1] dark:border-[#3f3f46] bg-[#f8fafc] dark:bg-[#09090b] text-sm"
                />
                <button
                  type="submit"
                  className="w-full min-h-[44px] rounded-xl bg-[#4338ca] hover:bg-[#3730a3] text-white font-bold text-sm transition-colors"
                >
                  Envoyer mon avis
                </button>
              </form>
            )}

            {/* Modale : Langue */}
            {activeModal === 'language' && (
              <div className="space-y-2">
                {(
                  [
                    { code: 'FR', label: 'Français (principal)' },
                    { code: 'EN', label: 'English (interface de base)' },
                    { code: 'ES', label: 'Español (interface de base)' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => {
                      onChangeLanguage(item.code);
                      setActiveModal(null);
                      onNotify(`Langue réglée sur ${item.code}.`);
                    }}
                    className={`w-full min-h-[44px] px-4 rounded-xl border text-left text-sm font-semibold flex items-center justify-between transition-colors ${
                      settings.language === item.code
                        ? 'border-[#4338ca] bg-indigo-50 dark:bg-indigo-500/20 text-[#312e81] dark:text-indigo-200'
                        : 'border-[#e2e8f0] dark:border-[#27272a] hover:bg-[#f1f5f9] dark:hover:bg-[#1e1e24]'
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className="font-mono text-xs font-bold">{item.code}</span>
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="w-full min-h-[44px] rounded-xl border border-[#cbd5e1] dark:border-[#3f3f46] bg-[#f1f5f9] dark:bg-[#27272a] hover:bg-[#e2e8f0] dark:hover:bg-[#3f3f46] font-bold text-sm transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
};
