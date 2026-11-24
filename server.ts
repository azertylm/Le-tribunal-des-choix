import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/status', (_req, res) => {
    res.json({
      aiAvailable: Boolean(process.env.GEMINI_API_KEY?.trim()),
      model: 'gemini-4-hydrogen',
    });
  });

  // 1. Verdict du Tribunal (nombre de participants illimité + compromis IA)
  app.post('/api/verdict', async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Clé Gemini non configurée sur le serveur. Utilisez le Mode Démo Hors-Ligne.',
      });
      return;
    }

    const { subject, players, judgeLabel } = req.body ?? {};
    if (
      typeof subject !== 'string' ||
      !Array.isArray(players) ||
      players.length < 2 ||
      typeof judgeLabel !== 'string'
    ) {
      res.status(400).json({ error: 'Paramètres de plaidoirie invalides (au moins 2 participants requis).' });
      return;
    }

    const sanitizedPlayers = players.map((p: { name?: string; plea?: string }, idx: number) => ({
      name: String(p?.name ?? `Participant ${idx + 1}`).trim().slice(0, 40) || `Participant ${idx + 1}`,
      plea: String(p?.plea ?? '').trim().slice(0, 400),
    }));

    const pleasPrompt = sanitizedPlayers
      .map((p, idx) => `${idx + 1}. ${p.name} : "${p.plea || '(aucune plaidoirie, air manifestement coupable)'}"`)
      .join('\n');

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Sujet du litige : ${subject.slice(0, 200)}\nNombre de participants : ${sanitizedPlayers.length}\nPlaidoiries :\n${pleasPrompt}`,
        config: {
          systemInstruction: `Tu es un juge d'humour français incarnant "${judgeLabel.slice(0, 60)}". Tranche ce débat de groupe (${sanitizedPlayers.length} personnes) avec esprit, rythme et drôlerie bienveillante, sans jamais être blessant. Désigne obligatoirement un des participants présents comme coupable, propose un gage bon enfant ET un compromis malin pour aider le groupe à se mettre d'accord. Réponds uniquement en JSON conforme au schéma demandé.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              culprit: {
                type: Type.STRING,
                description: 'Prénom exact du participant désigné coupable.',
              },
              reasoning: {
                type: Type.STRING,
                description: 'Jugement argumenté humoristique de 70 à 120 mots reprenant leurs arguments.',
              },
              forfeit: {
                type: Type.STRING,
                description: 'Gage symbolique absurde et bon enfant en une phrase.',
              },
              compromise: {
                type: Type.STRING,
                description: 'Un compromis concret, créatif et malin pour réconcilier tout le groupe en une phrase.',
              },
            },
            required: ['culprit', 'reasoning', 'forfeit', 'compromise'],
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      const parsed = JSON.parse(rawText);
      if (!parsed.culprit || !parsed.reasoning || !parsed.forfeit) {
        throw new Error('Réponse JSON incomplète');
      }
      res.json(parsed);
    } catch (error) {
      console.error('Erreur /api/verdict:', error);
      res.status(502).json({
        error: 'Impossible de joindre le Juge IA pour le moment. Vous pouvez basculer en Mode Démo.',
      });
    }
  });

  // 2. Générateur d'idées de propositions par l'IA (Restos, films, activités, gages...)
  app.post('/api/ai/suggest-options', async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Clé Gemini non configurée sur le serveur. Utilisez le Mode Démo Hors-Ligne.',
      });
      return;
    }

    const { topic, participants, existingOptions, count } = req.body ?? {};
    const safeTopic = typeof topic === 'string' && topic.trim() ? topic.trim().slice(0, 180) : 'Quel restaurant ou sortie choisir ?';
    const desiredCount = Math.min(8, Math.max(3, Number(count) || 5));
    const names = Array.isArray(participants)
      ? participants.map((n: unknown) => String(n || '').trim().slice(0, 30)).filter(Boolean)
      : [];
    const existing = Array.isArray(existingOptions)
      ? existingOptions.map((o: unknown) => String(o || '').trim().slice(0, 80)).filter(Boolean)
      : [];

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Question du groupe (${names.length || 2} personnes) : ${safeTopic}\nPropositions déjà présentes : ${existing.length ? existing.join(', ') : 'aucune'}\nGénère exactement ${desiredCount} propositions originales, concrètes, variées et fun (max 6 mots chacune).`,
        config: {
          systemInstruction:
            'Tu es le médiateur créatif et drôle de l’application française "Le Tribunal des Choix". Propose des options courtes, variées, immédiatement compréhensibles et tentantes pour aider un groupe indécis. Réponds uniquement en JSON.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Liste courte de propositions variées (3 à 8 éléments).',
              },
            },
            required: ['options'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      if (!Array.isArray(parsed.options) || parsed.options.length === 0) {
        throw new Error('Liste vide');
      }
      res.json({
        options: parsed.options
          .map((o: unknown) => String(o || '').trim().slice(0, 80))
          .filter(Boolean)
          .slice(0, 8),
      });
    } catch (error) {
      console.error('Erreur /api/ai/suggest-options:', error);
      res.status(502).json({
        error: 'Impossible de générer des idées IA pour le moment. Utilisez les idées rapides ou le Mode Démo.',
      });
    }
  });

  // 3. Décret / Commentaire fun du Juge IA après un Chiffre Mystère, Veto en Cascade ou Roue du Destin
  app.post('/api/ai/commentary', async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Clé Gemini non configurée sur le serveur. Utilisez le Mode Démo Hors-Ligne.',
      });
      return;
    }

    const { modeTitle, topic, winner, chosenNumber, pickedBy, participants, otherOptions } = req.body ?? {};
    if (typeof winner !== 'string' || !winner.trim()) {
      res.status(400).json({ error: 'Option gagnante manquante.' });
      return;
    }

    const names = Array.isArray(participants)
      ? participants.map((n: unknown) => String(n || '').trim().slice(0, 30)).filter(Boolean)
      : [];
    const others = Array.isArray(otherOptions)
      ? otherOptions.map((o: unknown) => String(o || '').trim().slice(0, 80)).filter(Boolean)
      : [];

    const contextPrompt = [
      `Méthode : ${String(modeTitle || 'Choix du Tribunal').slice(0, 80)}`,
      `Sujet : ${String(topic || 'Choix du groupe').slice(0, 180)}`,
      `Participants (${names.length}) : ${names.join(', ') || 'le groupe'}`,
      chosenNumber ? `Chiffre choisi oralement : n°${Number(chosenNumber)}` : '',
      pickedBy ? `Personne ayant choisi : ${String(pickedBy).slice(0, 40)}` : '',
      `Choix gagnant : ${winner.trim().slice(0, 120)}`,
      others.length ? `Autres choix non retenus : ${others.join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: contextPrompt,
        config: {
          systemInstruction:
            'Tu es le Juge farceur du "Tribunal des Choix" en France. Rédige une courte annonce enthousiaste et hilarante (50 à 85 mots) pour entériner le choix gagnant et taquiner gentiment les options éliminées, plus une clause bonus amusante (mini-défi ou règle du jeu bon enfant en 1 phrase). Réponds uniquement en JSON.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reasoning: {
                type: Type.STRING,
                description: 'Commentaire fun du Juge (50 à 85 mots) validant le choix gagnant.',
              },
              miniChallenge: {
                type: Type.STRING,
                description: 'Une règle ou mini-défi drôle et bon enfant en une phrase pour sceller l’accord.',
              },
            },
            required: ['reasoning', 'miniChallenge'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      if (!parsed.reasoning || !parsed.miniChallenge) {
        throw new Error('Réponse IA incomplète');
      }
      res.json(parsed);
    } catch (error) {
      console.error('Erreur /api/ai/commentary:', error);
      res.status(502).json({
        error: 'Le Juge IA est momentanément indisponible. Basculez en Mode Démo pour continuer.',
      });
    }
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Le Tribunal des Choix — Alphabette server running at http://0.0.0.0:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
