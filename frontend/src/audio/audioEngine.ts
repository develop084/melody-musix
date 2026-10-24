import { Track, AudioClip } from '../types';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private bufferCache = new Map<string, AudioBuffer>();
  private activeSourceNodes: AudioBufferSourceNode[] = [];
  private previewSourceNode: AudioBufferSourceNode | null = null;
  private previewGainNode: GainNode | null = null;

  public getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
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
    gainNode.connect(ctx.destination);

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
      trackGainNode.connect(ctx.destination);

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

        // Apply Fade-In / Fade-Out ramps
        const fadeInSec = (clip.fadeInMs || 150) / 1000;
        const fadeOutSec = (clip.fadeOutMs || 150) / 1000;

        clipGain.gain.setValueAtTime(0.001, whenToPlay);
        clipGain.gain.exponentialRampToValueAtTime(Math.max(0.001, baseVolume), whenToPlay + fadeInSec);
        clipGain.gain.setValueAtTime(
          Math.max(0.001, baseVolume),
          Math.max(whenToPlay + fadeInSec, whenToPlay + durationToPlay - fadeOutSec)
        );
        clipGain.gain.exponentialRampToValueAtTime(0.001, whenToPlay + durationToPlay);

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
