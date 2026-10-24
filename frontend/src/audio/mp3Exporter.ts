import lamejs from 'lamejs';
import { Track } from '../types';
import { audioEngine } from './audioEngine';

export async function renderTimelineToAudioBuffer(
  tracks: Track[],
  totalDurationMs: number,
  sampleRate = 44100
): Promise<AudioBuffer> {
  const totalDurationSec = Math.max(1, totalDurationMs / 1000);
  const totalSamples = Math.ceil(sampleRate * totalDurationSec);

  // Initialize OfflineAudioContext for fast headless rendering
  const offlineCtx = new OfflineAudioContext(2, totalSamples, sampleRate);

  const hasSolo = tracks.some((t) => t.solo);

  for (const track of tracks) {
    if (track.muted || (hasSolo && !track.solo)) continue;

    const trackGain = offlineCtx.createGain();
    trackGain.gain.setValueAtTime(track.volume, 0);
    trackGain.connect(offlineCtx.destination);

    for (const clip of track.clips) {
      const buffer = audioEngine.getCachedBuffer(clip.sourceUrl);
      if (!buffer) continue;

      const clipTimelineStartSec = clip.timelineStartMs / 1000;
      const clipDurationSec = clip.durationMs / 1000;
      const clipOffsetSec = clip.startOffsetMs / 1000;

      const clipSource = offlineCtx.createBufferSource();
      clipSource.buffer = buffer;

      const clipGain = offlineCtx.createGain();
      const baseVolume = clip.volume ?? 1.0;

      const fadeInSec = (clip.fadeInMs || 150) / 1000;
      const fadeOutSec = (clip.fadeOutMs || 150) / 1000;

      // Crossfade envelopes
      clipGain.gain.setValueAtTime(0.001, clipTimelineStartSec);
      clipGain.gain.exponentialRampToValueAtTime(
        Math.max(0.001, baseVolume),
        clipTimelineStartSec + fadeInSec
      );
      clipGain.gain.setValueAtTime(
        Math.max(0.001, baseVolume),
        Math.max(clipTimelineStartSec + fadeInSec, clipTimelineStartSec + clipDurationSec - fadeOutSec)
      );
      clipGain.gain.exponentialRampToValueAtTime(
        0.001,
        clipTimelineStartSec + clipDurationSec
      );

      clipSource.connect(clipGain);
      clipGain.connect(trackGain);

      clipSource.start(clipTimelineStartSec, clipOffsetSec, clipDurationSec);
    }
  }

  return offlineCtx.startRendering();
}

export function encodeAudioBufferToMp3(
  audioBuffer: AudioBuffer,
  bitrateKbps = 192,
  onProgress?: (percent: number) => void
): Blob {
  const channels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length;

  const leftFloat = audioBuffer.getChannelData(0);
  const rightFloat = channels > 1 ? audioBuffer.getChannelData(1) : leftFloat;

  // Convert Float32Array to 16-bit signed PCM Int16Array
  const leftInt16 = new Int16Array(length);
  const rightInt16 = new Int16Array(length);

  for (let i = 0; i < length; i++) {
    const l = Math.max(-1, Math.min(1, leftFloat[i]));
    const r = Math.max(-1, Math.min(1, rightFloat[i]));
    leftInt16[i] = l < 0 ? l * 32768 : l * 32767;
    rightInt16[i] = r < 0 ? r * 32768 : r * 32767;
  }

  const mp3Encoder = new lamejs.Mp3Encoder(2, sampleRate, bitrateKbps);
  const mp3Data: Uint8Array[] = [];

  const sampleBlockSize = 1152; // LAME standard frame size
  for (let i = 0; i < length; i += sampleBlockSize) {
    const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
    const rightChunk = rightInt16.subarray(i, i + sampleBlockSize);
    const mp3buf = mp3Encoder.encodeBuffer(leftChunk, rightChunk);
    if (mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf));
    }
    if (onProgress && i % (sampleBlockSize * 10) === 0) {
      onProgress(Math.floor((i / length) * 90));
    }
  }

  const endBuf = mp3Encoder.flush();
  if (endBuf.length > 0) {
    mp3Data.push(new Uint8Array(endBuf));
  }

  onProgress?.(100);
  return new Blob(mp3Data as any, { type: 'audio/mp3' });
}

export async function renderAndExportMp3(
  tracks: Track[],
  totalDurationMs: number,
  bitrateKbps = 192,
  onProgress?: (percent: number) => void
): Promise<Blob> {
  // Preload any uncached track buffers first
  await audioEngine.preloadTrackBuffers(tracks);
  onProgress?.(15);

  const renderedBuffer = await renderTimelineToAudioBuffer(tracks, totalDurationMs);
  onProgress?.(40);

  return encodeAudioBufferToMp3(renderedBuffer, bitrateKbps, (pct) => {
    onProgress?.(40 + Math.floor(pct * 0.6));
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.style.display = 'none';
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 100);
}
