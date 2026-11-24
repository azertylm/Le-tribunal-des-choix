let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      audioCtx = new AudioCtx();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playGavel(): void {
  const c = getAudioContext();
  if (!c) return;
  const now = c.currentTime;

  [0, 0.23].forEach((offset, i) => {
    const t = now + offset;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(i === 0 ? 210 : 195, t);
    osc.frequency.exponentialRampToValueAtTime(68, t + 0.11);
    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.15);

    const bufSize = Math.floor(c.sampleRate * 0.05);
    const buf = c.createBuffer(1, bufSize, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let j = 0; j < bufSize; j++) {
      data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (bufSize * 0.25));
    }
    const noise = c.createBufferSource();
    noise.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(950, t);
    filter.Q.setValueAtTime(2.5, t);
    const nGain = c.createGain();
    nGain.gain.setValueAtTime(0.55, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(c.destination);
    noise.start(t);
  });
}

export function playTick(): void {
  const c = getAudioContext();
  if (!c) return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(920, now);
  osc.frequency.exponentialRampToValueAtTime(420, now + 0.025);
  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.035);
}

export function playBuzzer(): void {
  const c = getAudioContext();
  if (!c) return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(165, now);
  osc.frequency.linearRampToValueAtTime(118, now + 0.18);
  gain.gain.setValueAtTime(0.22, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(now);
  osc.stop(now + 0.21);
}

export function playFanfare(): void {
  const c = getAudioContext();
  if (!c) return;
  const now = c.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, idx) => {
    const start = now + idx * 0.09;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.25, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + (idx === notes.length - 1 ? 0.45 : 0.16));
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(start);
    osc.stop(start + (idx === notes.length - 1 ? 0.48 : 0.18));
  });
}

export function playDrumroll(): void {
  const c = getAudioContext();
  if (!c) return;
  const now = c.currentTime;
  for (let i = 0; i < 8; i++) {
    const t = now + i * 0.075;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150 + i * 16, t);
    osc.frequency.exponentialRampToValueAtTime(85, t + 0.05);
    gain.gain.setValueAtTime(0.22 + i * 0.02, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.065);
  }
}
