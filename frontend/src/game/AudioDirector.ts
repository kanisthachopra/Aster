import type { Phase, Settings } from './types';
import type { ArrivalBeat } from './World';
import dialogueScript from './dialogue.json';

/** Original temporary synthesis for timing review, not the finished cinematic score. */
export class AudioDirector {
  private context: AudioContext | null = null;
  private music: GainNode | null = null;
  private effects: GainNode | null = null;
  private dialogue: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private voice: AudioBufferSourceNode | null = null;
  private voiceVersion = 0;
  private voiceCache = new Map<string, AudioBuffer>();
  private phrase = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private phase: Phase = 'title';
  private startTime = 0;
  private nextPhrase = 0;
  private settings: Settings;
  private reading = false;
  private active = new Set<AudioScheduledSourceNode>();

  constructor(settings: Settings) { this.settings = settings; }
  async start() {
    if (!this.context) {
      this.context = new AudioContext();
      this.music = this.context.createGain(); this.effects = this.context.createGain();
      this.dialogue = this.context.createGain();
      // Keep headroom for overlapping notes; gain controls are applied to live buses.
      const master = this.context.createGain(); master.gain.value = .45;
      this.music.connect(master); this.effects.connect(master); this.dialogue.connect(master); master.connect(this.context.destination);
      this.reverb = this.context.createConvolver();
      const impulse = this.context.createBuffer(2, this.context.sampleRate * 3.5, this.context.sampleRate);
      for (let channel = 0; channel < 2; channel++) {
        const data = impulse.getChannelData(channel);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3.5) * .3;
      }
      this.reverb.buffer = impulse; const wet = this.context.createGain(); wet.gain.value = .25;
      this.music.connect(this.reverb); this.reverb.connect(wet); wet.connect(master);
      this.applySettings(this.settings);
      this.timer = setInterval(() => this.tick(), 350);
    }
    await this.context.resume();
    await this.loadVoice('opening');
  }
  applySettings(settings: Settings) {
    this.settings = settings;
    if (!this.context || !this.music || !this.effects) return;
    this.music.gain.setTargetAtTime(settings.music * (this.voice ? .12 : this.reading ? .13 : 1), this.context.currentTime, .12);
    this.effects.gain.setTargetAtTime(settings.effects, this.context.currentTime, .12);
    this.dialogue?.gain.setTargetAtTime(settings.dialogue * 1.8, this.context.currentTime, .12);
  }
  setReading(reading: boolean) { this.reading = reading; this.applySettings(this.settings); }
  setPhase(phase: Phase) {
    if (this.phase === 'opening' && phase !== 'opening') this.stopDialogue();
    this.phase = phase;
    this.startTime = this.context?.currentTime ?? 0;
    this.nextPhrase = this.startTime;
    this.phrase = 0;
    if (phase === 'opening') void this.speak('opening');
  }
  private tone(frequency: number, at: number, duration: number, volume: number, effect = false, warm = false) {
    const ctx = this.context, bus = effect ? this.effects : this.music;
    if (!ctx || !bus) return;
    const oscillator = ctx.createOscillator(), envelope = ctx.createGain();
    oscillator.type = warm ? 'triangle' : 'sine'; oscillator.frequency.value = frequency;
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(volume, at + (warm ? .65 : .035));
    envelope.gain.exponentialRampToValueAtTime(.0001, at + duration);
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = warm ? 900 : 2600;
    oscillator.connect(filter); filter.connect(envelope); envelope.connect(bus);
    this.active.add(oscillator);
    oscillator.onended = () => { oscillator.disconnect(); filter.disconnect(); envelope.disconnect(); this.active.delete(oscillator); };
    oscillator.start(at); oscillator.stop(at + duration + .05);
  }
  private tick() {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running' || this.phase === 'title') return;
    const now = ctx.currentTime;
    if (now < this.nextPhrase) return;
    // The traveller speaks first. No repeated noise envelope posing as breathing.
    if (this.phase === 'opening' && now - this.startTime < 7) { this.nextPhrase = this.startTime + 7; return; }
    // Original motif: D–A–E–F# with a softer B minor / G variation between discoveries.
    const grand = this.phase === 'entry' || this.phase === 'opening';
    const sparse = this.reading || this.phase === 'station';
    const chords = [[146.83, 220, 293.66, 369.99], [123.47, 185, 246.94, 293.66], [98, 146.83, 196, 246.94], [110, 164.81, 220, 329.63]];
    const chord = chords[this.phrase % 4];
    if (!sparse) chord.forEach((note, i) => {
      this.tone(note, now + i * .08, grand ? 8 : 6.5, grand ? .055 : .024, false, true);
      this.tone(note * 1.003, now + .1, grand ? 8 : 6, grand ? .02 : .009, false, true);
    });
    const melody = sparse ? [293.66, 440, 329.63] : [293.66, 440, 329.63, 369.99, 587.33];
    melody.forEach((note, i) => this.tone(note, now + .5 + i * (grand ? .62 : .9), grand ? 3.5 : 2.7, sparse ? .045 : grand ? .095 : .05));
    if (grand) this.tone(chord[0] / 2, now, 8, .08, false, true);
    this.phrase++;
    this.nextPhrase = now + (sparse ? 15 : grand ? 7 : 11);
  }
  cue() {
    if (!this.context) return;
    [293.66, 440, 587.33].forEach((note, i) => this.tone(note, this.context!.currentTime + i * .15, 1.6, .13, true));
  }
  private noise(duration: number, level: number, frequency: number) {
    const ctx = this.context; if (!ctx || !this.effects) return;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate), data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / data.length * 5);
    const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), envelope = ctx.createGain();
    source.buffer = buffer; filter.type = 'lowpass'; filter.frequency.value = frequency; envelope.gain.value = level;
    source.connect(filter); filter.connect(envelope); envelope.connect(this.effects); this.active.add(source);
    source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); this.active.delete(source); }; source.start();
  }
  footstep() { this.noise(.18, .22, this.phase === 'guided' ? 750 : 220); }
  arrivalBeat(beat: ArrivalBeat) {
    if (!this.context) return;
    const now = this.context.currentTime;
    if (beat === 'threshold') { this.noise(1.5, .18, 550); this.cue(); }
    if (beat === 'lights') for (let i = 0; i < 4; i++) this.tone(100 + i * 65, now + i * .5, .8, .12, true);
    if (beat === 'machine') {
      this.noise(3, .2, 1700);
      const motor = this.context.createOscillator(), gain = this.context.createGain();
      motor.type = 'sawtooth'; motor.frequency.setValueAtTime(42, now); motor.frequency.exponentialRampToValueAtTime(190, now + 2.4);
      gain.gain.setValueAtTime(.003, now); gain.gain.linearRampToValueAtTime(.035, now + .6); gain.gain.exponentialRampToValueAtTime(.0001, now + 3);
      motor.connect(gain); gain.connect(this.effects!); this.active.add(motor); motor.start(); motor.stop(now + 3.1);
      motor.onended = () => { motor.disconnect(); gain.disconnect(); this.active.delete(motor); };
    }
    if (beat === 'robot') [392, 587.33, 783.99].forEach((note, i) => this.tone(note, now + i * .16, 1, .08, true));
    void this.speak(beat);
  }
  greet() { void this.speak('guide'); }
  guide(key: string) {
    if (Object.hasOwn(dialogueScript, key)) void this.speak(key);
  }
  stopDialogue() { this.voiceVersion++; this.voice?.stop(); this.voice = null; this.applySettings(this.settings); }
  private async loadVoice(key: string) {
    const ctx = this.context;
    if (!ctx || !Object.hasOwn(dialogueScript, key)) return null;
    let buffer = this.voiceCache.get(key);
    if (!buffer) {
      const response = await fetch(`/audio/${key}.wav`);
      if (!response.ok) throw new Error(`Dialogue unavailable: ${key}`);
      buffer = await ctx.decodeAudioData(await response.arrayBuffer());
      this.voiceCache.set(key, buffer);
    }
    return buffer;
  }
  private async speak(key: string) {
    const ctx = this.context; if (!ctx || !this.dialogue) return;
    const version = ++this.voiceVersion;
    this.voice?.stop(); this.voice = null;
    try {
      const buffer = await this.loadVoice(key);
      if (!buffer) return;
      if (version !== this.voiceVersion || ctx.state === 'closed') return;
      const voice = ctx.createBufferSource(); voice.buffer = buffer; voice.connect(this.dialogue);
      this.music?.gain.setTargetAtTime(this.settings.music * .12, ctx.currentTime, .08);
      this.voice = voice; voice.onended = () => { voice.disconnect(); if (this.voice === voice) { this.voice = null; this.applySettings(this.settings); } }; voice.start();
    } catch { /* Subtitles remain the source of truth when an audition file is unavailable. */ }
  }
  dispose() {
    if (this.timer) clearInterval(this.timer);
    this.voiceVersion++; this.voice?.stop(); this.voice = null;
    for (const source of this.active) { try { source.stop(); } catch { /* Already ended. */ } }
    this.active.clear(); void this.context?.close(); this.context = null;
  }
}
