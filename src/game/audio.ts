/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ToolType } from './types.ts';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private isDriving: boolean = false;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.engineGain) {
      this.engineGain.gain.setValueAtTime(0, this.ctx ? this.ctx.currentTime : 0);
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public playPlace(type: ToolType) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    switch (type) {
      case 'home': {
        // Warm dual-tone marimba chime (A4 -> E5)
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(440, t);
        osc2.frequency.setValueAtTime(659.25, t);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 0.35);
        osc2.stop(t + 0.35);
        break;
      }
      case 'river': {
        // Water bubbling splash
        const bufferSize = this.ctx.sampleRate * 0.25;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, t);
        filter.frequency.exponentialRampToValueAtTime(1400, t + 0.25);
        filter.Q.value = 4.0;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start(t);
        break;
      }
      case 'building': {
        // Deep structural metallic thud
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(45, t + 0.3);

        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.3);
        break;
      }
      case 'road': {
        // Smooth snap + high roll
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, t);
        osc.frequency.exponentialRampToValueAtTime(780, t + 0.15);

        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.15);
        break;
      }
      case 'light': {
        // Electric glow chime
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, t);
        osc.frequency.exponentialRampToValueAtTime(1320, t + 0.4);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.4);
        break;
      }
      case 'demolish': {
        // Heavy crumble
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, t);
        osc.frequency.exponentialRampToValueAtTime(25, t + 0.28);

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.28);
        break;
      }
    }
  }

  public playFirework() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Whistle
    const whistle = this.ctx.createOscillator();
    const wGain = this.ctx.createGain();
    whistle.type = 'sine';
    whistle.frequency.setValueAtTime(300, t);
    whistle.frequency.exponentialRampToValueAtTime(1500, t + 0.35);
    wGain.gain.setValueAtTime(0.12, t);
    wGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    whistle.connect(wGain);
    wGain.connect(this.ctx.destination);
    whistle.start(t);
    whistle.stop(t + 0.35);

    // Boom after 0.35s
    setTimeout(() => {
      if (!this.ctx || this.isMuted) return;
      const bt = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const bGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(130, bt);
      osc.frequency.exponentialRampToValueAtTime(30, bt + 0.5);
      bGain.gain.setValueAtTime(0.4, bt);
      bGain.gain.exponentialRampToValueAtTime(0.001, bt + 0.5);
      osc.connect(bGain);
      bGain.connect(this.ctx.destination);
      osc.start(bt);
      osc.stop(bt + 0.5);
    }, 350);
  }

  public startEngine() {
    if (this.isDriving || this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    this.isDriving = true;
    this.engineOsc = this.ctx.createOscillator();
    this.engineGain = this.ctx.createGain();

    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.setValueAtTime(55, this.ctx.currentTime);
    this.engineGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(250, this.ctx.currentTime);

    this.engineOsc.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);

    this.engineOsc.start();
  }

  public updateEngine(speedRatio: number) {
    if (!this.engineOsc || !this.ctx || this.isMuted) return;
    const targetFreq = 55 + Math.abs(speedRatio) * 160;
    this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.08);
  }

  public stopEngine() {
    if (!this.isDriving) return;
    this.isDriving = false;
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      setTimeout(() => {
        try {
          this.engineOsc?.stop();
          this.engineOsc?.disconnect();
          this.engineGain?.disconnect();
        } catch {
          // ignore
        }
        this.engineOsc = null;
        this.engineGain = null;
      }, 150);
    }
  }
}

export const soundEngine = new SoundEngine();
