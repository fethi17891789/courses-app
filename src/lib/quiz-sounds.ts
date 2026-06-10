"use client";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx || ctx.state === "closed") {
    ctx = new AudioContext();
  }
  return ctx;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.3,
  startDelay = 0
) {
  const c = getCtx();
  if (!c) return;

  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, c.currentTime + startDelay);

  gain.gain.setValueAtTime(0, c.currentTime + startDelay);
  gain.gain.linearRampToValueAtTime(volume, c.currentTime + startDelay + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + startDelay + duration);

  osc.start(c.currentTime + startDelay);
  osc.stop(c.currentTime + startDelay + duration + 0.05);
}

/** Resumes AudioContext after user gesture (required by browsers) */
export function resumeAudio() {
  const c = getCtx();
  if (c && c.state === "suspended") c.resume();
}

/** Bip de countdown 3-2-1 */
export function playCountdownBeep(isLast = false) {
  playTone(isLast ? 880 : 660, 0.18, "sine", 0.35);
}

/** Son "GO !" */
export function playGo() {
  playTone(880, 0.12, "sine", 0.4, 0);
  playTone(1100, 0.25, "sine", 0.4, 0.1);
}

/** Tic-tac normal */
export function playTick() {
  playTone(1200, 0.04, "square", 0.12);
}

/** Tic-tac urgent (dernieres secondes) */
export function playUrgentTick() {
  playTone(1600, 0.04, "square", 0.2);
  playTone(800, 0.03, "square", 0.1, 0.05);
}

/** Correct ! arpege montant joyeux */
export function playCorrect() {
  playTone(523, 0.12, "sine", 0.35, 0);
  playTone(659, 0.12, "sine", 0.35, 0.1);
  playTone(784, 0.2, "sine", 0.35, 0.2);
  playTone(1047, 0.3, "sine", 0.3, 0.32);
}

/** Faux - buzzer descendant */
export function playWrong() {
  playTone(300, 0.08, "sawtooth", 0.25, 0);
  playTone(200, 0.25, "sawtooth", 0.2, 0.1);
}

/** Points gagnes - petit twinkle */
export function playPoints() {
  playTone(1047, 0.08, "sine", 0.2, 0);
  playTone(1319, 0.08, "sine", 0.2, 0.07);
  playTone(1568, 0.12, "sine", 0.15, 0.14);
}

/** Fanfare podium finale */
export function playFanfare() {
  const notes = [523, 659, 784, 1047, 784, 1047, 1319];
  const times = [0, 0.12, 0.24, 0.36, 0.54, 0.66, 0.78];
  const durs  = [0.1, 0.1, 0.1, 0.15, 0.1, 0.1, 0.4];
  notes.forEach((f, i) => playTone(f, durs[i], "sine", 0.3, times[i]));
}

/** Son quand un joueur rejoint la salle d'attente */
export function playPlayerJoin() {
  playTone(880, 0.06, "sine", 0.2, 0);
  playTone(1100, 0.1, "sine", 0.15, 0.07);
}

/** Suspense avant le reveal (bref roulement) */
export function playRevealDrum() {
  for (let i = 0; i < 6; i++) {
    playTone(120 + i * 10, 0.04, "sawtooth", 0.15, i * 0.05);
  }
  playTone(200, 0.2, "sawtooth", 0.25, 0.32);
}
