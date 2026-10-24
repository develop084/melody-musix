import { Track, AudioClip } from '../types';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private bufferCache = new Map<string, AudioBuffer>();
  private activeSourceNodes: AudioBufferSourceNode[] = [];
  private previewSourceNode: AudioBufferSourceNode | null = null;
  private previewGainNode: GainNode | null = null;

  // Master Audio Bus & Effects Chain
  private masterGainNode: GainNode | null = null;
  private masterFilterNode: BiquadFilterNode | null = null;
  private masterLimiterNode: DynamicsCompressorNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private analyserDataArray: Uint8Array | null = null;

  public getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.initMasterChain(this.ctx);
    return this.ctx;
  }

  private initMasterChain(ctx: AudioContext) {
    if (this.masterGainNode) return;

    this.masterGainNode = ctx.createGain();
    this.masterGainNode.gain.setValueAtTime(1.0, ctx.currentTime);

    this.masterFilterNode = ctx.createBiquadFilter();
    this.masterFilterNode.type = 'lowpass';
    this.masterFilterNode.frequency.setValueAtTime(20000, ctx.currentTime);

    this.masterLimiterNode = ctx.createDynamicsCompressor();
    this.masterLimiterNode.threshold.setValueAtTime(-1.0, ctx.currentTime);
    this.masterLimiterNode.knee.setValueAtTime(0, ctx.currentTime);
    this.masterLimiterNode.ratio.setValueAtTime(20, ctx.currentTime);
    this.masterLimiterNode.attack.setValueAtTime(0.003, ctx.currentTime);
    this.masterLimiterNode.release.setValueAtTime(0.05, ctx.currentTime);

    this.analyserNode = ctx.createAnalyser();
    this.analyserNode.fftSize = 64;
    this.analyserNode.smoothingTimeConstant = 0.8;
    this.analyserDataArray = new Uint8Array(this.analyserNode.frequencyBinCount);

    this.masterGainNode.connect(this.masterFilterNode);
    this.masterFilterNode.connect(this.masterLimiterNode);
    this.masterLimiterNode.connect(this.analyserNode);
    this.analyserNode.connect(ctx.destination);
  }

  public getMasterBus(): AudioNode {
    const ctx = this.getContext();
    this.initMasterChain(ctx);
    return this.masterGainNode!;
  }

  public getFrequencyData(): Uint8Array {
    if (!this.analyserNode || !this.analyserDataArray) {
      return new Uint8Array(0);
    }
    this.analyserNode.getByteFrequencyData(this.analyserDataArray as any);
    return this.analyserDataArray;
  }

  public setMasterFilterFrequency(freq: number) {
    if (!this.masterFilterNode || !this.ctx) return;
    const clamped = Math.max(200, Math.min(20000, freq));
    this.masterFilterNode.frequency.setTargetAtTime(clamped, this.ctx.currentTime, 0.05);
  }

  public setMasterVolume(vol: number) {
    if (!this.masterGainNode || !this.ctx) return;
    const clamped = Math.max(0, Math.min(2.0, vol));
    this.masterGainNode.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.05);
  }

  // Fetch and decode audio stream into AudioBuffer
  async decodeAudioFromUrl(url: string): Promise<AudioBuffer> {
    if (this.bufferCache.has(url)) {
      return this.bufferCache.get(url)!;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio stream: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const ctx = this.getContext();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    this.bufferCache.set(url, audioBuffer);
    return audioBuffer;
  }

  // Decode local audio file (MP3, WAV, M4A)
  async decodeAudioFromFile(file: File): Promise<{ buffer: AudioBuffer; url: string }> {
    const arrayBuffer = await file.arrayBuffer();
    const ctx = this.getContext();
    const buffer = await ctx.decodeAudioData(arrayBuffer);
    const blobUrl = URL.createObjectURL(file);
    this.bufferCache.set(blobUrl, buffer);
    return { buffer, url: blobUrl };
  }

  // Pre-load all clips in tracks to ensure instant stutter-free playback
  async preloadTrackBuffers(tracks: Track[]): Promise<void> {
    const urls = new Set<string>();
    for (const track of tracks) {
      for (const clip of track.clips) {
        if (!this.bufferCache.has(clip.sourceUrl)) {
          urls.add(clip.sourceUrl);
        }
      }
    }
    await Promise.all(
      Array.from(urls).map((url) =>
        this.decodeAudioFromUrl(url).catch((err) => {
          console.warn('Failed to pre-decode audio buffer for url:', url, err);
        })
      )
    );
  }

  getCachedBuffer(url: string): AudioBuffer | undefined {
    return this.bufferCache.get(url);
  }

  // Play a single snippet preview (e.g. In/Out trimmer)
  playSnippet(
    buffer: AudioBuffer,
    startOffsetSec: number,
    durationSec: number,
    volume = 1.0,
    onEnded?: () => void
  ) {
    this.stopSnippet();
    const ctx = this.getContext();

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);

    source.connect(gainNode);
    gainNode.connect(this.getMasterBus());

    const safeDuration = Math.min(durationSec, Math.max(0, buffer.duration - startOffsetSec));
    source.start(0, startOffsetSec, safeDuration);

    source.onended = () => {
      onEnded?.();
    };

    this.previewSourceNode = source;
    this.previewGainNode = gainNode;
  }

  stopSnippet() {
    if (this.previewSourceNode) {
      try {
        this.previewSourceNode.stop();
        this.previewSourceNode.disconnect();
      } catch {}
      this.previewSourceNode = null;
    }
  }

  // Play master multitrack timeline
  playTimeline(
    tracks: Track[],
    startOffsetMs: number,
    onEnded?: () => void
  ) {
    this.stopTimeline();
    const ctx = this.getContext();
    const startTime = ctx.currentTime;
    const startSec = startOffsetMs / 1000;

    let maxEndTime = 0;

    // Check if any track is soloed
    const hasSolo = tracks.some((t) => t.solo);

    for (const track of tracks) {
      if (track.muted || (hasSolo && !track.solo)) continue;

      const trackGainNode = ctx.createGain();
      trackGainNode.gain.setValueAtTime(track.volume, ctx.currentTime);
      trackGainNode.connect(this.getMasterBus());

      for (const clip of track.clips) {
        const buffer = this.bufferCache.get(clip.sourceUrl);
        if (!buffer) continue;

        const clipTimelineStartSec = clip.timelineStartMs / 1000;
        const clipDurationSec = clip.durationMs / 1000;
        const clipEndSec = clipTimelineStartSec + clipDurationSec;

        // Skip clips that have already passed
        if (clipEndSec <= startSec) continue;

        const clipSource = ctx.createBufferSource();
        clipSource.buffer = buffer;

        // Per-clip gain node with linear crossfade curves
        const clipGain = ctx.createGain();
        const baseVolume = clip.volume ?? 1.0;

        let whenToPlay = 0;
        let offsetInClip = 0;
        let durationToPlay = 0;

        if (clipTimelineStartSec >= startSec) {
          whenToPlay = startTime + (clipTimelineStartSec - startSec);
          offsetInClip = clip.startOffsetMs / 1000;
          durationToPlay = clipDurationSec;
        } else {
          // Playhead is in the middle of this clip
          const elapsedInClip = startSec - clipTimelineStartSec;
          whenToPlay = startTime;
          offsetInClip = clip.startOffsetMs / 1000 + elapsedInClip;
          durationToPlay = clipDurationSec - elapsedInClip;
        }

        // Apply Fade-In / Fade-Out linear ramps safely
        const clipDur = Math.max(0.05, durationToPlay);
        const maxFade = clipDur * 0.45;
        const actualFadeIn = Math.min((clip.fadeInMs || 150) / 1000, maxFade);
        const actualFadeOut = Math.min((clip.fadeOutMs || 150) / 1000, maxFade);

        clipGain.gain.setValueAtTime(0, whenToPlay);
        clipGain.gain.linearRampToValueAtTime(baseVolume, whenToPlay + actualFadeIn);
        clipGain.gain.setValueAtTime(baseVolume, whenToPlay + clipDur - actualFadeOut);
        clipGain.gain.linearRampToValueAtTime(0, whenToPlay + clipDur);

        clipSource.connect(clipGain);
        clipGain.connect(trackGainNode);

        clipSource.start(whenToPlay, offsetInClip, durationToPlay);
        this.activeSourceNodes.push(clipSource);

        if (whenToPlay + durationToPlay > maxEndTime) {
          maxEndTime = whenToPlay + durationToPlay;
        }
      }
    }

    // Schedule onEnded timer
    if (maxEndTime > startTime) {
      const remainingMs = (maxEndTime - startTime) * 1000;
      setTimeout(() => {
        onEnded?.();
      }, remainingMs);
    }
  }

  stopTimeline() {
    for (const node of this.activeSourceNodes) {
      try {
        node.stop();
        node.disconnect();
      } catch {}
    }
    this.activeSourceNodes = [];
  }
}

export const audioEngine = new AudioEngine();
