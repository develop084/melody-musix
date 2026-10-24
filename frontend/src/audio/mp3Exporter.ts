import { Track } from '../types';
import { audioEngine } from './audioEngine';
import { getLame } from './lameEncoder';

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

      // Safe linear ramp clamps to prevent DOMExceptions
      const clipDur = Math.max(0.05, clipDurationSec);
      const maxFade = clipDur * 0.45;
      const actualFadeIn = Math.min((clip.fadeInMs || 150) / 1000, maxFade);
      const actualFadeOut = Math.min((clip.fadeOutMs || 150) / 1000, maxFade);

      clipGain.gain.setValueAtTime(0, clipTimelineStartSec);
      clipGain.gain.linearRampToValueAtTime(baseVolume, clipTimelineStartSec + actualFadeIn);
      clipGain.gain.setValueAtTime(baseVolume, clipTimelineStartSec + clipDur - actualFadeOut);
      clipGain.gain.linearRampToValueAtTime(0, clipTimelineStartSec + clipDur);

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
  const { Mp3Encoder } = getLame();

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

  const mp3Encoder = new Mp3Encoder(2, sampleRate, bitrateKbps);
  const mp3Data: Uint8Array[] = [];

  const sampleBlockSize = 1152;
  for (let i = 0; i < length; i += sampleBlockSize) {
    const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
    const rightChunk = rightInt16.subarray(i, i + sampleBlockSize);
    const mp3buf = mp3Encoder.encodeBuffer(leftChunk, rightChunk);
    if (mp3buf && mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf));
    }
    if (onProgress && i % (sampleBlockSize * 10) === 0) {
      onProgress(Math.floor((i / length) * 90));
    }
  }

  const endBuf = mp3Encoder.flush();
  if (endBuf && endBuf.length > 0) {
    mp3Data.push(new Uint8Array(endBuf));
  }

  onProgress?.(100);
  return new Blob(mp3Data as any, { type: 'audio/mp3' });
}

// 16-bit PCM WAV Encoder fallback
export function encodeAudioBufferToWav(audioBuffer: AudioBuffer): Blob {
  const numChannels = 2;
  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length;
  const buffer = new ArrayBuffer(44 + length * 4);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length * 4, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, length * 4, true);

  const left = audioBuffer.getChannelData(0);
  const right = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : left;

  let offset = 44;
  for (let i = 0; i < length; i++) {
    const l = Math.max(-1, Math.min(1, left[i]));
    const r = Math.max(-1, Math.min(1, right[i]));
    view.setInt16(offset, l < 0 ? l * 32768 : l * 32767, true);
    view.setInt16(offset + 2, r < 0 ? r * 32768 : r * 32767, true);
    offset += 4;
  }

  return new Blob([buffer], { type: 'audio/wav' });
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

  try {
    return encodeAudioBufferToMp3(renderedBuffer, bitrateKbps, (pct) => {
      onProgress?.(40 + Math.floor(pct * 0.6));
    });
  } catch (err) {
    console.warn('LAME MP3 encoding encountered error, generating lossless WAV fallback:', err);
    return encodeAudioBufferToWav(renderedBuffer);
  }
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
  }, 200);
}
