import type { DecisionResult, VerdictResult } from '../types/bazar';

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 30
): number {
  const paragraphs = String(text || '').split('\n');
  let curY = y;
  let totalLines = 0;

  for (const para of paragraphs) {
    const words = para.split(/\s+/);
    let line = '';
    for (let i = 0; i < words.length; i++) {
      const testLine = line ? `${line} ${words[i]}` : words[i];
      if (ctx.measureText(testLine).width > maxWidth && line) {
        ctx.fillText(line, x, curY);
        curY += lineHeight;
        totalLines++;
        line = words[i];
        if (totalLines >= maxLines) return curY;
      } else {
        line = testLine;
      }
    }
    if (line) {
      ctx.fillText(line, x, curY);
      curY += lineHeight;
      totalLines++;
    }
    curY += lineHeight * 0.25;
  }
  return curY;
}

async function shareOrDownloadCanvas(
  canvas: HTMLCanvasElement,
  filename: string,
  shareTitle: string,
  onNotify: (msg: string) => void
): Promise<void> {
  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        onNotify('Erreur lors de la génération PNG.');
        resolve();
        return;
      }
      const file = new File([blob], filename, { type: 'image/png' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: shareTitle,
            text: 'Créé avec Le Tribunal des Choix · Alphabette',
            files: [file],
          });
          onNotify('Image partagée !');
          resolve();
          return;
        } catch (err) {
          if ((err as { name?: string })?.name === 'AbortError') {
            resolve();
            return;
          }
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onNotify('Image PNG téléchargée !');
      resolve();
    }, 'image/png');
  });
}

export function exportVerdictPNG(v: VerdictResult, onNotify: (msg: string) => void): void {
  const c = document.createElement('canvas');
  c.width = 1080;
  c.height = 1350;
  const ctx = c.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FAF8F4';
  ctx.fillRect(0, 0, c.width, c.height);

  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 10;
  ctx.strokeRect(28, 28, c.width - 56, c.height - 56);
  ctx.lineWidth = 3;
  ctx.strokeRect(46, 46, c.width - 92, c.height - 92);

  ctx.fillStyle = '#0F172A';
  ctx.fillRect(66, 66, c.width - 132, 130);
  ctx.fillStyle = '#FACC15';
  ctx.font = '800 24px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${v.caseNumber}  ·  LE TRIBUNAL DES CHOIX`, 540, 110);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 54px "Playfair Display", Georgia, serif';
  ctx.fillText('ARRÊT DU TRIBUNAL', 540, 172);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#B91C1C';
  ctx.font = '800 26px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`JUGE : ${v.judgeLabel.toUpperCase()}`, 82, 248);

  ctx.fillStyle = '#18181B';
  ctx.font = '700 28px "Plus Jakarta Sans", sans-serif';
  let y = wrapCanvasText(ctx, `Litige : « ${v.subject} »`, 82, 294, 916, 38, 2);

  ctx.fillStyle = '#0F172A';
  ctx.fillRect(82, y + 8, 916, 4);

  ctx.fillStyle = '#111827';
  ctx.font = '500 30px "Plus Jakarta Sans", sans-serif';
  y = wrapCanvasText(ctx, v.reasoning, 82, y + 60, 916, 44, 11);

  const culpritY = Math.max(y + 20, 820);
  ctx.fillStyle = '#DC2626';
  ctx.fillRect(82, culpritY, 916, 145);
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 4;
  ctx.strokeRect(82, culpritY, 916, 145);
  ctx.fillStyle = '#FEF2F2';
  ctx.font = '800 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('LE COUPABLE DÉSIGNÉ', 112, culpritY + 46);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 44px "Playfair Display", Georgia, serif';
  ctx.fillText(v.culprit, 112, culpritY + 108);

  const forfeitY = culpritY + 170;
  ctx.fillStyle = '#FACC15';
  ctx.fillRect(82, forfeitY, 916, 200);
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 4;
  ctx.strokeRect(82, forfeitY, 916, 200);
  ctx.fillStyle = '#0F172A';
  ctx.font = '800 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('GAGE SYMBOLIQUE ABSURDE', 112, forfeitY + 44);
  ctx.font = '700 28px "Plus Jakarta Sans", sans-serif';
  wrapCanvasText(ctx, v.forfeit, 112, forfeitY + 90, 856, 38, 3);

  ctx.fillStyle = '#52525B';
  ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Le Tribunal des Choix · Alphabette — Justice 100 % garantie sans appel', 540, 1288);

  void shareOrDownloadCanvas(
    c,
    `arret-tribunal-${Date.now()}.png`,
    'Arrêt du Tribunal — Le Tribunal des Choix',
    onNotify
  );
}

export function exportDecisionPNG(d: DecisionResult, onNotify: (msg: string) => void): void {
  const c = document.createElement('canvas');
  c.width = 1080;
  c.height = 1350;
  const ctx = c.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FAF8F4';
  ctx.fillRect(0, 0, c.width, c.height);

  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 10;
  ctx.strokeRect(28, 28, c.width - 56, c.height - 56);
  ctx.lineWidth = 3;
  ctx.strokeRect(46, 46, c.width - 92, c.height - 92);

  ctx.fillStyle = '#0F172A';
  ctx.fillRect(66, 66, c.width - 132, 130);
  ctx.fillStyle = '#FACC15';
  ctx.font = '800 24px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${d.caseNumber}  ·  LE TRIBUNAL DES CHOIX`, 540, 110);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 50px "Playfair Display", Georgia, serif';
  ctx.fillText('DÉCRET OFFICIEL', 540, 172);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#3F51B5';
  ctx.font = '800 25px "Plus Jakarta Sans", sans-serif';
  const subInfo = d.chosenNumber
    ? `${d.modeTitle.toUpperCase()} · CHIFFRE N°${d.chosenNumber}${d.pickedBy ? ` (${d.pickedBy})` : ''}`
    : d.modeTitle.toUpperCase();
  ctx.fillText(subInfo, 82, 248);

  ctx.fillStyle = '#18181B';
  ctx.font = '700 28px "Plus Jakarta Sans", sans-serif';
  let y = wrapCanvasText(ctx, `Question : « ${d.topic} »`, 82, 294, 916, 38, 2);

  ctx.fillStyle = '#0F172A';
  ctx.fillRect(82, y + 8, 916, 4);

  const winnerY = y + 36;
  ctx.fillStyle = '#047857';
  ctx.fillRect(82, winnerY, 916, 175);
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 4;
  ctx.strokeRect(82, winnerY, 916, 175);
  ctx.fillStyle = '#D1FAE5';
  ctx.font = '800 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('CHOIX RETENU SANS APPEL', 112, winnerY + 46);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 44px "Playfair Display", Georgia, serif';
  wrapCanvasText(ctx, d.winner, 112, winnerY + 106, 856, 52, 2);

  ctx.fillStyle = '#111827';
  ctx.font = '500 30px "Plus Jakarta Sans", sans-serif';
  y = wrapCanvasText(ctx, d.reasoning, 82, winnerY + 235, 916, 44, 8);

  const challengeY = Math.max(y + 24, 965);
  ctx.fillStyle = '#FACC15';
  ctx.fillRect(82, challengeY, 916, 210);
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 4;
  ctx.strokeRect(82, challengeY, 916, 210);
  ctx.fillStyle = '#0F172A';
  ctx.font = '800 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('CLAUSE BONUS DU TRIBUNAL', 112, challengeY + 44);
  ctx.font = '700 28px "Plus Jakarta Sans", sans-serif';
  wrapCanvasText(ctx, d.miniChallenge, 112, challengeY + 92, 856, 38, 3);

  ctx.fillStyle = '#52525B';
  ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Le Tribunal des Choix · Alphabette — Justice 100 % garantie sans appel', 540, 1288);

  void shareOrDownloadCanvas(
    c,
    `decret-choix-${Date.now()}.png`,
    'Décret Officiel — Le Tribunal des Choix',
    onNotify
  );
}
