import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ABSURD_SUBJECTS,
  ALPHABETTE_SUITE_APPS,
  buildDemoDecisionVerdict,
  buildDemoVerdict,
  formatCaseNumber,
  getNextVetoTurn,
  getSuggestedParticipantName,
  parseSpokenNumber,
  pickNextDistinct,
  shuffleList,
} from './bazarLogic';

test('buildDemoVerdict supports unlimited participants and returns culprit, reasoning, forfeit, compromise', () => {
  const players = [
    { name: 'Camille', plea: 'Je range toujours les assiettes au fond.' },
    { name: 'Julien', plea: 'Les verres vont en haut.' },
    { name: 'Sam', plea: 'Moi je fais la vaisselle à la main.' },
    { name: 'Chloé', plea: 'Personne ne rince les bols.' },
    { name: 'Léo', plea: 'On commande des pizzas et on oublie.' },
  ];

  const verdict = buildDemoVerdict('Le lave-vaisselle', players, 'solennel', () => 0.85);
  assert.equal(verdict.culprit, 'Léo');
  assert.match(verdict.reasoning, /Code Civil des Choix/);
  assert.match(verdict.reasoning, /5 participants/);
  assert.ok(verdict.forfeit.length > 10);
  assert.ok(verdict.compromise.length > 10);

  const satiriste = buildDemoVerdict('Pizza ananas', players, 'satiriste', () => 0.0);
  assert.equal(satiriste.culprit, 'Camille');
  assert.match(satiriste.reasoning, /escroquerie intellectuelle/);

  const sportif = buildDemoVerdict('La clim', players, 'sportif', () => 0.45);
  assert.equal(sportif.culprit, 'Sam');
  assert.match(sportif.reasoning, /CARTON ROUGE/);
});

test('parseSpokenNumber extracts French spoken words and digits within range', () => {
  assert.equal(parseSpokenNumber('2', 5), 2);
  assert.equal(parseSpokenNumber('Je choisis le numéro 3 !', 5), 3);
  assert.equal(parseSpokenNumber('un', 3), 1);
  assert.equal(parseSpokenNumber('le deuxième s il te plaît', 3), 2);
  assert.equal(parseSpokenNumber('trois', 3), 3);
  assert.equal(parseSpokenNumber('dix-neuf', 20), 19);
  assert.equal(parseSpokenNumber('vingt et un', 25), 21);
  assert.equal(parseSpokenNumber('quatre', 3), null);
  assert.equal(parseSpokenNumber('99', 5), null);
  assert.equal(parseSpokenNumber('bonjour tout le monde', 5), null);
});

test('shuffleList preserves elements without mutating source array', () => {
  const original = ['Resto végétarien', 'Resto japonais', 'Resto burger', 'Crêperie'];
  let seed = 0.2;
  const rng = () => {
    seed = (seed + 0.37) % 1;
    return seed;
  };
  const shuffled = shuffleList(original, rng);
  assert.deepEqual(original, ['Resto végétarien', 'Resto japonais', 'Resto burger', 'Crêperie']);
  assert.equal(shuffled.length, original.length);
  assert.deepEqual([...shuffled].sort(), [...original].sort());
});

test('getNextVetoTurn cycles seamlessly across any number of participants', () => {
  const names = ['Camille', 'Julien', 'Sam', 'Léo'];
  assert.deepEqual(getNextVetoTurn(names, 0), { currentPlayer: 'Camille', turnNumber: 1 });
  assert.deepEqual(getNextVetoTurn(names, 3), { currentPlayer: 'Léo', turnNumber: 4 });
  assert.deepEqual(getNextVetoTurn(names, 4), { currentPlayer: 'Camille', turnNumber: 5 });
  assert.deepEqual(getNextVetoTurn(names, 5), { currentPlayer: 'Julien', turnNumber: 6 });
});

test('getSuggestedParticipantName returns unused names then numbered fallback', () => {
  assert.equal(getSuggestedParticipantName(['Camille', 'Julien']), 'Sam');
  const twelve = [
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
  assert.equal(getSuggestedParticipantName(twelve), 'Participant 13');
});

test('buildDemoDecisionVerdict formats mystery, veto, and wheel decrees cleanly', () => {
  const mystery = buildDemoDecisionVerdict({
    mode: 'mystery',
    topic: 'Quel resto ce soir ?',
    winner: 'Resto japonais',
    chosenNumber: 2,
    pickedBy: 'Julien',
    optionsCount: 3,
    randomFn: () => 0.1,
  });
  assert.match(mystery.reasoning, /n°2/);
  assert.match(mystery.reasoning, /Resto japonais/);
  assert.ok(mystery.miniChallenge.length > 10);

  const veto = buildDemoDecisionVerdict({
    mode: 'veto',
    topic: 'Film du soir',
    winner: 'Comédie française',
    optionsCount: 4,
    randomFn: () => 0.5,
  });
  assert.match(veto.reasoning, /vetos croisés/);
});

test('pickNextDistinct and formatCaseNumber behave deterministically', () => {
  const first = ABSURD_SUBJECTS[0];
  const next = pickNextDistinct(ABSURD_SUBJECTS, first, () => 0);
  assert.notEqual(next, first);
  assert.match(formatCaseNumber(2026, () => 0.5), /^AFFAIRE N° 2026-TC-\d{3}$/);
  assert.ok(ALPHABETTE_SUITE_APPS.some((a) => a.id === 'le-tribunal-des-choix' && a.isCurrent));
});
