export type MusicMood = 'CALM' | 'COMBAT' | 'BOSS' | 'OFF';

class CyberSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private isMuted = false;
  private bgmVolume = 0.55;
  private sfxVolume = 0.85;
  private mood: MusicMood = 'OFF';
  private stepIndex = 0;
  private nextNoteTime = 0;
  private schedulerId: number | null = null;
  private lastShootSound = 0;
  private lastHitSound = 0;
  private lastXpSound = 0;
  private autoUnlockBound = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(14, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.18, this.ctx.currentTime);

      this.bgmGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.bgmGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);

      // Pre-generate shared noise buffer for snappy percussion & explosions
      const len = Math.floor(this.ctx.sampleRate * 0.35);
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      this.syncGains();
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().then(() => {
        if (this.ctx && this.mood !== 'OFF') {
          this.nextNoteTime = Math.max(this.nextNoteTime, this.ctx.currentTime + 0.03);
        }
      });
    }
    return this.ctx;
  }

  private syncGains(): void {
    if (!this.ctx || !this.masterGain || !this.bgmGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 1.15, now, 0.015);
    this.bgmGain.gain.setTargetAtTime(this.bgmVolume * 0.9, now, 0.03);
    this.sfxGain.gain.setTargetAtTime(this.sfxVolume * 1.1, now, 0.02);
  }

  public bindAutoUnlock(initialMood: MusicMood = 'CALM'): void {
    if (typeof window === 'undefined' || this.autoUnlockBound) return;
    this.autoUnlockBound = true;

    const wake = () => {
      const ctx = this.ensureContext();
      if (ctx) {
        // Play an ultra-brief zero-gain pulse so Safari/Chrome fully unlocks hardware audio immediately
        try {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, ctx.currentTime);
          osc.connect(g);
          g.connect(ctx.destination);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.01);
        } catch {
          // Ignore edge browser errors
        }
      }
      if (this.mood === 'OFF' && initialMood !== 'OFF') {
        this.setMood(initialMood);
      }
      if (this.ctx && this.ctx.state === 'running') {
        window.removeEventListener('pointerdown', wake);
        window.removeEventListener('keydown', wake);
        window.removeEventListener('touchstart', wake);
      }
    };

    window.addEventListener('pointerdown', wake, { passive: true });
    window.addEventListener('keydown', wake, { passive: true });
    window.addEventListener('touchstart', wake, { passive: true });
  }

  public unlock(): void {
    const ctx = this.ensureContext();
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume().then(() => {
        if (this.ctx && this.mood !== 'OFF') {
          this.nextNoteTime = this.ctx.currentTime + 0.03;
        }
      });
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    this.syncGains();
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setBgmVolume(val: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, val));
    this.syncGains();
  }

  public getBgmVolume(): number {
    return this.bgmVolume;
  }

  public setSfxVolume(val: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, val));
    this.syncGains();
  }

  public getSfxVolume(): number {
    return this.sfxVolume;
  }

  public setMood(newMood: MusicMood): void {
    if (this.mood === newMood) return;
    this.mood = newMood;
    if (newMood === 'OFF') {
      if (this.schedulerId !== null) {
        window.clearInterval(this.schedulerId);
        this.schedulerId = null;
      }
      return;
    }

    const ctx = this.ensureContext();
    if (!ctx) return;

    this.nextNoteTime = ctx.currentTime + 0.04;
    if (this.schedulerId === null) {
      this.stepIndex = 0;
      this.schedulerId = window.setInterval(() => this.scheduleLoop(), 35);
    }
  }

  private scheduleLoop(): void {
    if (!this.ctx || this.mood === 'OFF' || this.isMuted) return;
    if (this.ctx.state !== 'running') return;

    if (this.nextNoteTime < this.ctx.currentTime - 0.1) {
      this.nextNoteTime = this.ctx.currentTime + 0.02;
    }

    const tempo = this.mood === 'BOSS' ? 142 : this.mood === 'COMBAT' ? 128 : 94;
    const stepDuration = 60 / tempo / 2;

    while (this.nextNoteTime < this.ctx.currentTime + 0.16) {
      this.triggerBgmStep(this.stepIndex, this.nextNoteTime, stepDuration);
      this.nextNoteTime += stepDuration;
      this.stepIndex = (this.stepIndex + 1) % 32;
    }
  }

  private triggerBgmStep(step: number, time: number, dur: number): void {
    if (!this.ctx || !this.bgmGain) return;

    if (this.mood === 'CALM') {
      // Warm Tay Nguyen pentatonic chimes + lush synth pad
      const calmRoots = [146.83, 146.83, 123.47, 123.47, 196.0, 196.0, 164.81, 220.0];
      const bar = Math.floor(step / 4) % calmRoots.length;
      if (step % 4 === 0) {
        this.playTone(calmRoots[bar], 'sine', time, dur * 3.8, 0.28, this.bgmGain, 750);
      }
      const arpNotes = [587.33, 659.25, 739.99, 880.0, 739.99, 659.25, 587.33, 493.88];
      if (step % 2 === 0) {
        const note = arpNotes[(step / 2) % arpNotes.length];
        this.playTone(note, 'triangle', time, dur * 1.45, 0.14, this.bgmGain, 2400);
      }
      return;
    }

    if (this.mood === 'COMBAT') {
      const bassRoots = [110.0, 110.0, 87.31, 87.31, 98.0, 98.0, 82.41, 98.0];
      const bar = Math.floor(step / 4) % bassRoots.length;
      const bassFreq = bassRoots[bar];
      this.playTone(
        step % 2 === 0 ? bassFreq : bassFreq * 2,
        'sawtooth',
        time,
        dur * 0.78,
        step % 2 === 0 ? 0.26 : 0.14,
        this.bgmGain,
        680,
      );

      const arpScale = [440, 523.25, 659.25, 783.99, 659.25, 523.25, 587.33, 493.88];
      const leadNote = arpScale[step % arpScale.length];
      if (step % 2 === 1 || step % 4 === 0) {
        this.playTone(leadNote, 'triangle', time, dur * 0.85, 0.14, this.bgmGain, 2800);
      }

      if (step % 4 === 0) {
        this.playKick(time, 0.34);
      } else if (step % 4 === 2) {
        this.playSnare(time, 0.14);
      } else {
        this.playHiHat(time, 0.085);
      }
      return;
    }

    if (this.mood === 'BOSS') {
      const bossBass = [73.42, 73.42, 87.31, 82.41, 73.42, 73.42, 98.0, 110.0];
      const bar = Math.floor(step / 4) % bossBass.length;
      this.playTone(bossBass[bar], 'sawtooth', time, dur * 0.72, 0.3, this.bgmGain, 920);

      const bossArp = [587.33, 698.46, 880.0, 698.46, 659.25, 587.33, 523.25, 554.37];
      this.playTone(
        bossArp[step % bossArp.length],
        'square',
        time,
        dur * 0.58,
        0.11,
        this.bgmGain,
        2400,
      );

      if (step % 2 === 0) {
        this.playKick(time, 0.38);
      } else {
        this.playSnare(time, 0.12);
        this.playHiHat(time, 0.09);
      }
    }
  }

  private playTone(
    freq: number,
    type: OscillatorType,
    startTime: number,
    duration: number,
    peakGain: number,
    dest: AudioNode,
    cutoff = 3400,
  ): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, peakGain), startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  private playNoise(
    startTime: number,
    duration: number,
    peakGain: number,
    dest: AudioNode,
    filterType: BiquadFilterType,
    freq: number,
  ): void {
    if (!this.ctx || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(freq, startTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(Math.max(0.001, peakGain), startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    src.start(startTime);
    src.stop(startTime + duration + 0.02);
  }

  private playKick(startTime: number, peak: number): void {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(155, startTime);
    osc.frequency.exponentialRampToValueAtTime(40, startTime + 0.13);
    gain.gain.setValueAtTime(peak, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
    osc.connect(gain);
    gain.connect(this.bgmGain);
    osc.start(startTime);
    osc.stop(startTime + 0.16);
  }

  private playSnare(startTime: number, peak: number): void {
    if (!this.bgmGain) return;
    this.playNoise(startTime, 0.1, peak, this.bgmGain, 'bandpass', 2200);
    this.playTone(190, 'triangle', startTime, 0.07, peak * 0.7, this.bgmGain, 1200);
  }

  private playHiHat(startTime: number, peak: number): void {
    if (!this.bgmGain) return;
    this.playNoise(startTime, 0.045, peak, this.bgmGain, 'highpass', 6500);
  }

  public playShoot(overdrive = false): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.isMuted) return;
    const now = ctx.currentTime;
    if (now - this.lastShootSound < 0.045) return;
    this.lastShootSound = now;

    // Crisp mechanical key-click + bright plasma laser snap
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = overdrive ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(overdrive ? 1050 : 880, now);
    osc.frequency.exponentialRampToValueAtTime(210, now + 0.085);
    gain.gain.setValueAtTime(overdrive ? 0.28 : 0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.095);

    this.playNoise(now, 0.032, 0.12, this.sfxGain, 'highpass', 3200);
  }

  public playHit(isCrit = false): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.isMuted) return;
    const now = ctx.currentTime;
    if (now - this.lastHitSound < 0.03) return;
    this.lastHitSound = now;

    // Crunchy low thump + sharp metallic impact
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isCrit ? 'sawtooth' : 'square';
    osc.frequency.setValueAtTime(isCrit ? 640 : 340, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.075);
    gain.gain.setValueAtTime(isCrit ? 0.28 : 0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.085);

    if (isCrit) {
      this.playTone(1320, 'triangle', now, 0.08, 0.22, this.sfxGain, 4500);
    }
  }

  public playKill(isBoss = false, combo = 1): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.isMuted) return;
    const now = ctx.currentTime;
    if (isBoss) {
      this.playNoise(now, 0.34, 0.38, this.sfxGain, 'lowpass', 900);
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, idx) => {
        this.playTone(freq, 'sawtooth', now + idx * 0.07, 0.42, 0.32, this.sfxGain!, 3200);
      });
      return;
    }

    // Crisp bug-squash pop + rising combo chime
    this.playNoise(now, 0.08, 0.2, this.sfxGain, 'bandpass', 1400);
    const pitchBoost = Math.min(combo, 16) * 18;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(290 + pitchBoost, now);
    osc.frequency.exponentialRampToValueAtTime(760 + pitchBoost, now + 0.095);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playShockwave(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.isMuted) return;
    const now = ctx.currentTime;
    // Heavy Mechanical Keyboard SLAM + Expanding Pulse
    this.playNoise(now, 0.22, 0.34, this.sfxGain, 'lowpass', 1600);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.26);
    gain.gain.setValueAtTime(0.36, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.3);
    this.playTone(587.33, 'triangle', now + 0.02, 0.2, 0.24, this.sfxGain, 3200);
  }

  public playBeacon(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.isMuted) return;
    const now = ctx.currentTime;
    [440, 587.33, 880, 1174.66].forEach((freq, i) => {
      this.playTone(freq, 'sine', now + i * 0.055, 0.36, 0.25, this.sfxGain!, 4200);
    });
  }

  public playXpPickup(combo = 0): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.isMuted) return;
    const now = ctx.currentTime;
    if (now - this.lastXpSound < 0.03) return;
    this.lastXpSound = now;

    const base = 700 + Math.min(combo, 14) * 42;
    this.playTone(base, 'sine', now, 0.09, 0.2, this.sfxGain, 4500);
  }

  public playDash(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.isMuted) return;
    const now = ctx.currentTime;
    this.playNoise(now, 0.14, 0.22, this.sfxGain, 'bandpass', 2400);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(980, now + 0.13);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playPlayerDamage(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.isMuted) return;
    const now = ctx.currentTime;
    this.playNoise(now, 0.16, 0.28, this.sfxGain, 'lowpass', 1100);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(195, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.2);
    gain.gain.setValueAtTime(0.36, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.23);
  }

  public playLevelUp(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.isMuted) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      this.playTone(freq, 'triangle', now + i * 0.06, 0.28, 0.28, this.sfxGain!, 4000);
    });
  }

  public playBossWarning(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.isMuted) return;
    const now = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const start = now + i * 0.26;
      this.playTone(220, 'sawtooth', start, 0.18, 0.34, this.sfxGain, 1500);
      this.playTone(165, 'sawtooth', start + 0.09, 0.16, 0.3, this.sfxGain, 1100);
    }
  }

  public playUltimate(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.isMuted) return;
    const now = ctx.currentTime;
    this.playNoise(now, 0.32, 0.35, this.sfxGain, 'bandpass', 1200);
    [146.83, 293.66, 440, 587.33, 739.99, 880, 1174.66].forEach((freq, idx) => {
      this.playTone(freq, 'triangle', now + idx * 0.028, 0.7, 0.28, this.sfxGain!, 3800);
    });
  }

  public playVictory(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.isMuted) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 987.77, 1046.5, 1318.51];
    notes.forEach((freq, i) => {
      this.playTone(freq, 'triangle', now + i * 0.095, 0.48, 0.3, this.sfxGain!, 4200);
    });
  }
}

export const soundEngine = new CyberSoundEngine();
