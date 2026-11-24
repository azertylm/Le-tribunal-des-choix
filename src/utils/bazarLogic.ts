import type {
  AlphabetteAppItem,
  AppModeKey,
  DecisionOption,
  JudgeKey,
  PlayerPlea,
} from '../types/bazar';

export const ALPHABETTE_SUITE_APPS: AlphabetteAppItem[] = [
  {
    id: 'le-tribunal-des-choix',
    name: 'Le Tribunal des Choix',
    tagline: 'Plaidoiries, chiffre mystère oral, veto en cascade et roue IA',
    url: 'https://alphabette.fr',
    isNew: true,
    isCurrent: true,
  },
  {
    id: 'info-perso',
    name: 'Info Perso',
    tagline: 'Vos repères essentiels du quotidien en un clin d’œil',
    url: 'https://alphabette.fr',
  },
  {
    id: 'mots-clairs',
    name: 'Mots Clairs',
    tagline: 'Jeux de lettres et défis vocabulaires accessibles à tous',
    url: 'https://alphabette.fr',
    isNew: true,
  },
  {
    id: 'carnet-balade',
    name: 'Carnet Balade',
    tagline: 'Idées de sorties locales, patrimoine et curiosités de proximité',
    url: 'https://alphabette.fr',
    isNew: true,
  },
  {
    id: 'memo-doux',
    name: 'Mémo Doux',
    tagline: 'Rappels sereins, routines et liste du jour sans stress',
    url: 'https://alphabette.fr',
  },
  {
    id: 'cuisine-minute',
    name: 'Cuisine Minute',
    tagline: 'Recettes de saison simples, lisibles et guidées à la voix',
    url: 'https://alphabette.fr',
  },
];

export const DEFAULT_PARTICIPANT_NAMES: string[] = [
  'Camille',
  'Julien',
  'Sam',
  'Chloé',
  'Léo',
  'Inès',
  'Milo',
  'Zoé',
  'Noah',
  'Jade',
  'Lucas',
  'Manon',
];

export const ABSURD_SUBJECTS: string[] = [
  'Où mange-t-on ce soir sans déclencher une guerre civile ?',
  'Le rangement stratégique du lave-vaisselle',
  'Qui doit payer la prochaine tournée ?',
  'Pain au chocolat contre Chocolatine : la guerre finale',
  "L'ananas sur la pizza : crime culinaire ou génie incompris ?",
  'Quel film regarder ce soir avant de s’endormir devant le menu ?',
  'La température exacte de la climatisation',
  'Qui a laissé le rouleau de papier toilette vide ?',
  'Destination du prochain week-end entre amis',
  'Qui a mangé le dernier carré de chocolat en secret ?',
];

export interface OptionPreset {
  id: string;
  label: string;
  topic: string;
  options: string[];
}

export const OPTION_PRESETS: OptionPreset[] = [
  {
    id: 'resto',
    label: 'Resto ce soir',
    topic: 'Quel restaurant choisir ce soir ?',
    options: ['Resto végétarien', 'Resto japonais', 'Resto burger'],
  },
  {
    id: 'film',
    label: 'Film du soir',
    topic: 'Quel film ou série lancer ce soir ?',
    options: ['Comédie française culte', 'Thriller à suspense', 'Film d’animation', 'Documentaire décalé'],
  },
  {
    id: 'weekend',
    label: 'Sortie week-end',
    topic: 'Que fait-on ce week-end ?',
    options: ['Balade nature & pique-nique', 'Jeux de société au chaud', 'Brunch + brocante', 'Cinéma + crêperie'],
  },
  {
    id: 'apero',
    label: 'Apéro express',
    topic: 'Qu’est-ce qu’on prend pour l’apéro ?',
    options: ['Planche fromages & pain chaud', 'Tapas & houmous maison', 'Pizza à partager', 'Sushis & gyozas'],
  },
];

export const JUDGE_META: Record<
  JudgeKey,
  { label: string; shortLabel: string; description: string }
> = {
  solennel: {
    label: 'Magistrat Ultra-Solennel',
    shortLabel: 'Magistrat Solennel',
    description: 'Code civil & grandiloquence',
  },
  satiriste: {
    label: 'Satiriste Grinçant',
    shortLabel: 'Satiriste Grinçant',
    description: 'Ironie mordante & piques',
  },
  sportif: {
    label: 'Commentateur Sportif Hystérique',
    shortLabel: 'Commentateur Sportif',
    description: 'VAR du litige & tension max',
  },
};

export function pickNextDistinct<T>(items: T[], current: T, randomFn: () => number = Math.random): T {
  if (items.length <= 1) return items[0];
  const pool = items.filter((item) => item !== current);
  if (pool.length === 0) return items[0];
  const idx = Math.floor(randomFn() * pool.length) % pool.length;
  return pool[idx];
}

export function formatCaseNumber(year: number, randomFn: () => number = Math.random): string {
  const num = 100 + (Math.floor(randomFn() * 900) % 900);
  return `AFFAIRE N° ${year}-TC-${num}`;
}

export function getSuggestedParticipantName(existingNames: string[]): string {
  const lower = new Set(existingNames.map((n) => n.trim().toLowerCase()));
  for (const candidate of DEFAULT_PARTICIPANT_NAMES) {
    if (!lower.has(candidate.toLowerCase())) {
      return candidate;
    }
  }
  return `Participant ${existingNames.length + 1}`;
}

export function shuffleList<T>(items: T[], randomFn: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1)) % (i + 1);
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

const FRENCH_NUMBER_WORDS: Array<[RegExp, number]> = [
  [/\b(vingt[\s-]?cinq)\b/i, 25],
  [/\b(vingt[\s-]?quatre)\b/i, 24],
  [/\b(vingt[\s-]?trois)\b/i, 23],
  [/\b(vingt[\s-]?deux)\b/i, 22],
  [/\b(vingt[\s-]?(et[\s-]?)?un)\b/i, 21],
  [/\b(vingt|vingti[eè]me)\b/i, 20],
  [/\b(dix[\s-]?neuf)\b/i, 19],
  [/\b(dix[\s-]?huit)\b/i, 18],
  [/\b(dix[\s-]?sept)\b/i, 17],
  [/\b(seize|seizi[eè]me)\b/i, 16],
  [/\b(quinze|quinzi[eè]me)\b/i, 15],
  [/\b(quatorze|quatorzi[eè]me)\b/i, 14],
  [/\b(treize|treizi[eè]me)\b/i, 13],
  [/\b(douze|douzi[eè]me)\b/i, 12],
  [/\b(onze|onzi[eè]me)\b/i, 11],
  [/\b(dix|dixi[eè]me)\b/i, 10],
  [/\b(neuf|neuvi[eè]me)\b/i, 9],
  [/\b(huit|huiti[eè]me)\b/i, 8],
  [/\b(sept|septi[eè]me)\b/i, 7],
  [/\b(six|sixi[eè]me)\b/i, 6],
  [/\b(cinq|cinqui[eè]me)\b/i, 5],
  [/\b(quatre|quatri[eè]me)\b/i, 4],
  [/\b(trois|troisi[eè]me)\b/i, 3],
  [/\b(deux|deuxi[eè]me|second|seconde)\b/i, 2],
  [/\b(un|une|premier|premi[eè]re)\b/i, 1],
];

/**
 * Extracts a spoken 1-based choice index from French voice recognition text.
 * Supports digits ("2", "numéro 3") and French words ("un", "deuxième", "douze").
 * Returns null if no valid number within [1, maxCount] is found.
 */
export function parseSpokenNumber(transcript: string, maxCount: number): number | null {
  if (!transcript || maxCount < 1) return null;
  const normalized = transcript.trim().toLowerCase();
  if (!normalized) return null;

  // 1. Look for explicit numeric digits first (e.g. "numéro 3", "12", "le 2")
  const digitMatches = normalized.match(/\d+/g);
  if (digitMatches) {
    for (let i = digitMatches.length - 1; i >= 0; i--) {
      const n = Number.parseInt(digitMatches[i], 10);
      if (Number.isFinite(n) && n >= 1 && n <= maxCount) {
        return n;
      }
    }
  }

  // 2. Fallback to French words (ordered longest/highest first so "dix-neuf" beats "neuf")
  for (const [pattern, value] of FRENCH_NUMBER_WORDS) {
    if (value <= maxCount && pattern.test(normalized)) {
      return value;
    }
  }

  return null;
}

export function getNextVetoTurn(
  participantNames: string[],
  eliminatedCount: number
): { currentPlayer: string; turnNumber: number } {
  const safeNames =
    participantNames.length > 0
      ? participantNames.map((n, i) => n.trim() || `Participant ${i + 1}`)
      : ['Participant 1'];
  const idx = eliminatedCount % safeNames.length;
  return {
    currentPlayer: safeNames[idx],
    turnNumber: eliminatedCount + 1,
  };
}

export function buildDemoVerdict(
  subject: string,
  activePlayers: Array<Pick<PlayerPlea, 'name' | 'plea'>>,
  judgeKey: JudgeKey,
  randomFn: () => number = Math.random
): { culprit: string; reasoning: string; forfeit: string; compromise: string } {
  const cleanSubject = subject.trim() || 'Un litige domestique majeur';
  const normalized = activePlayers.map((p, idx) => ({
    name: p.name.trim() || `Participant ${idx + 1}`,
    plea: p.plea.trim(),
  }));

  const culpritIdx = Math.floor(randomFn() * normalized.length) % normalized.length;
  const culpritObj = normalized[culpritIdx];
  const innocentObj = normalized.find((p) => p !== culpritObj) || normalized[0];
  const groupCount = normalized.length;

  const pleaSnippet = culpritObj.plea
    ? `notamment l'argument hautement suspect « ${culpritObj.plea.slice(0, 75)}${culpritObj.plea.length > 75 ? '…' : ''} »`
    : `un silence assourdissant qui confine à l'aveu complet`;

  const crowdNote =
    groupCount > 3
      ? ` devant une assemblée survoltée de ${groupCount} participants`
      : '';

  const forfeits = [
    `Préparer la prochaine tournée de boissons pour ${innocentObj.name} et le groupe en les appelant « Votre Honneur » pendant 10 minutes.`,
    `Faire un discours solennel de 20 secondes sur la grandeur morale de ${innocentObj.name}, debout sur une jambe.`,
    `Céder officiellement le contrôle absolu de la playlist et de la télécommande jusqu'à demain midi.`,
    `Rédiger une excuse diplomatique au sujet de « ${cleanSubject} » et la déclamer avec un accent dramatique.`,
    `Offrir la prochaine tournée de cafés ou desserts sans aucune contestation possible.`,
  ];
  const forfeit = forfeits[Math.floor(randomFn() * forfeits.length) % forfeits.length];

  const compromises = [
    `Option paix des braves : on suit l'idée de ${innocentObj.name} aujourd'hui, et ${culpritObj.name} obtient un joker prioritaire sur la prochaine décision du groupe.`,
    `Compromis de la Cour : divisez la poire en deux — ${culpritObj.name} choisit l'horaire, le reste du groupe choisit le lieu ou le format.`,
    `Trêve immédiate : testez le choix majoritaire cette fois-ci avec interdiction officielle de râler pendant 2 heures.`,
  ];
  const compromise = compromises[Math.floor(randomFn() * compromises.length) % compromises.length];

  let reasoning = '';
  if (judgeKey === 'solennel') {
    reasoning = `VU le Code Civil des Choix, article 42 alinéa B ;\nATTENDU que le litige portant sur « ${cleanSubject} » trouble gravement la paix du groupe${crowdNote} ;\nATTENDU que la défense de ${culpritObj.name} — ${pleaSnippet} — manque cruellement de rigueur juridique face à la droiture exemplaire de ${innocentObj.name} ;\nPAR CES MOTIFS, la Cour statue en dernier ressort et condamne la mauvaise foi caractérisée.`;
  } else if (judgeKey === 'satiriste') {
    reasoning = `Franchement, on a rarement vu un dossier aussi bancal sur « ${cleanSubject} »${crowdNote}. Pendant que ${innocentObj.name} tente péniblement de sauver l'honneur de l'humanité, ${culpritObj.name} nous sert ${pleaSnippet}. C'est audacieux, c'est théâtral, mais ça ne trompe absolument personne. Le tribunal salue l'effort artistique mais sanctionne l'escroquerie intellectuelle.`;
  } else {
    reasoning = `OH LA LA MESDAMES ET MESSIEURS ! QUEL MATCH DE FOLIE SUR « ${cleanSubject} »${crowdNote} ! On fait appel à la VAR… ET C'EST CARTON ROUGE DIRECT POUR ${culpritObj.name.toUpperCase()} ! Regardez ce ralenti : ${pleaSnippet} ! Face au pressing chirurgical de ${innocentObj.name}, c'est un K.O. technique à la 90e minute ! LE STADE EST EN DÉLIRE !`;
  }

  return {
    culprit: culpritObj.name,
    reasoning,
    forfeit,
    compromise,
  };
}

export function buildDemoSuggestedOptions(topic: string): string[] {
  const lower = topic.toLowerCase();
  if (lower.includes('film') || lower.includes('série') || lower.includes('ciné')) {
    return [
      'Comédie culte bien rythmée',
      'Thriller haletant à retournement',
      'Film d’animation plein d’humour',
      'Classique des années 90',
      'Série courte en 2 épisodes',
    ];
  }
  if (lower.includes('week-end') || lower.includes('sortie') || lower.includes('vacance') || lower.includes('activité')) {
    return [
      'Balade au grand air + goûter',
      'Tournoi de jeux de société',
      'Escape game ou quiz maison',
      'Musée insolite + café',
      'Pique-nique improvisé',
    ];
  }
  if (lower.includes('gage') || lower.includes('défi')) {
    return [
      'Imiter un commentateur sportif pendant 30 s',
      'Préparer le prochain café de tout le monde',
      'Parler en rimes pendant 3 minutes',
      'Faire le DJ officiel de la prochaine chanson',
    ];
  }
  return [
    'Resto végétarien créatif',
    'Resto japonais & ramens',
    'Resto burger artisanal',
    'Pizzeria napolitaine au feu de bois',
    'Bistrot tapas à partager',
  ];
}

export function buildDemoDecisionVerdict(params: {
  mode: Exclude<AppModeKey, 'tribunal'>;
  topic: string;
  winner: string;
  chosenNumber?: number;
  pickedBy?: string;
  optionsCount: number;
  randomFn?: () => number;
}): { reasoning: string; miniChallenge: string } {
  const rng = params.randomFn ?? Math.random;
  const cleanTopic = params.topic.trim() || 'Le grand choix du jour';

  let reasoning = '';
  if (params.mode === 'mystery') {
    const picker = params.pickedBy ? `${params.pickedBy} a` : 'La voix du destin a';
    reasoning = `${picker} prononcé le chiffre sacré n°${params.chosenNumber ?? 1} à l'aveugle parmi ${params.optionsCount} propositions secrètes pour « ${cleanTopic} ». Le sceau est brisé : « ${params.winner} » l'emporte sans la moindre possibilité de négociation !`;
  } else if (params.mode === 'veto') {
    reasoning = `Après une impitoyable série de vetos croisés sur « ${cleanTopic} », une seule proposition a survécu à tous les coups de tampon : « ${params.winner} ». C'est officiellement le choix le plus consensuel de la table !`;
  } else {
    reasoning = `La Roue du Destin a tourné sous haute tension pour « ${cleanTopic} » et l'aiguille s'est figée sans trembler sur « ${params.winner} ». La gravité et le hasard ont tranché : l'affaire est close !`;
  }

  const challenges = [
    `Interdiction formelle de dire « ah mais moi j'aurais préféré autre chose » pendant les 2 prochaines heures.`,
    `Le premier qui râle contre « ${params.winner} » devient automatiquement responsable de la prochaine organisation.`,
    `Tout le monde trinque (même à l'eau !) en proclamant : « Vive le Tribunal des Choix ! »`,
    `Celui ou celle qui a proposé « ${params.winner} » gagne le titre honorifique de Président de Séance jusqu'à demain.`,
  ];

  const miniChallenge = challenges[Math.floor(rng() * challenges.length) % challenges.length];
  return { reasoning, miniChallenge };
}

export function createOptionId(): string {
  return `opt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createParticipantId(): string {
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function makeOptionsFromLabels(labels: string[]): DecisionOption[] {
  return labels
    .map((l) => l.trim())
    .filter(Boolean)
    .map((label, idx) => ({
      id: `opt-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      label,
    }));
}
