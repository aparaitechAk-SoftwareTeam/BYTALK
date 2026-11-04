// mobile/src/utils/ringtoneHelper.js
// Handles audible ringing bell sound on incoming and outgoing voice/video calls
import { Platform } from 'react-native';

class RingtoneManager {
  constructor() {
    this.audioContext = null;
    this.intervalId = null;
    this.isPlaying = false;
    this.oscillators = [];
  }

  // Initialize or resume Web AudioContext
  getAudioContext() {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new AudioCtx();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
    return this.audioContext;
  }

  // Generate a telephone ring burst using dual tones (440Hz + 480Hz)
  playToneBurst(durationSec = 1.6) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      // Standard North American / International dual ringing frequencies
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(440, now); // A4
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(480, now); // B4

      // Gentle gain envelope to avoid clicking
      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.22, now + 0.05);
      gainNode.gain.setValueAtTime(0.22, now + durationSec - 0.08);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + durationSec);
      osc2.stop(now + durationSec);

      this.oscillators.push(osc1, osc2);
      setTimeout(() => {
        this.oscillators = this.oscillators.filter((o) => o !== osc1 && o !== osc2);
      }, durationSec * 1000 + 100);
    } catch (err) {
      console.warn('[Ringtone] error playing burst:', err?.message);
    }
  }

  // Start continuous ringing bell
  startRinging({ direction = 'incoming' } = {}) {
    if (this.isPlaying) return;
    this.isPlaying = true;

    // 1. Web implementation with Web Audio API
    if (Platform.OS === 'web' || typeof window !== 'undefined') {
      const burstDuration = direction === 'incoming' ? 1.6 : 1.2;
      const cycleInterval = direction === 'incoming' ? 3500 : 4000;

      // Play first burst immediately
      this.playToneBurst(burstDuration);

      // Repeat burst according to standard telephone ring cadence
      this.intervalId = setInterval(() => {
        if (!this.isPlaying) return;
        this.playToneBurst(burstDuration);
      }, cycleInterval);
    }

    // 2. React Native native in-call manager fallback
    if (Platform.OS !== 'web') {
      try {
        const InCallManager = require('react-native-incall-manager').default;
        if (InCallManager) {
          if (direction === 'incoming') {
            InCallManager.startRingtone('_DEFAULT_');
          } else {
            InCallManager.startRingback('_DEFAULT_');
          }
        }
      } catch (err) {
        console.log('[Ringtone] InCallManager native ring skipped:', err?.message);
      }
    }
  }

  // Stop ringing immediately
  stopRinging() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Stop active oscillators
    for (const osc of this.oscillators) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {}
    }
    this.oscillators = [];

    // Stop native InCallManager
    if (Platform.OS !== 'web') {
      try {
        const InCallManager = require('react-native-incall-manager').default;
        if (InCallManager) {
          InCallManager.stopRingtone();
          InCallManager.stopRingback();
        }
      } catch {}
    }
  }
}

export const ringtoneManager = new RingtoneManager();
export default ringtoneManager;
