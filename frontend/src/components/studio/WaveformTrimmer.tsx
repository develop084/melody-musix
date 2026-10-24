import React, { useRef, useEffect, useState } from 'react';
import { useStudioStore } from '../../stores/studioStore';
import { audioEngine } from '../../audio/audioEngine';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import {
  Scissors,
  Play,
  Square,
  Plus,
  Sparkles,
  Search,
  Music2,
  CheckCircle2,
  ArrowRight,
  Loader2,
  X,
  Volume2,
} from 'lucide-react';

export interface WaveformTrimmerProps {
  onOpenSourceModal?: (query?: string) => void;
}

const QUICK_SAMPLES = [
  {
    id: 'sample-synth-lead',
    title: 'Neon Poly Lead',
    category: 'SYNTH LEAD',
    key: 'F# min',
    bpm: '120 BPM',
    url: '/api/v1/media/stream?videoId=sample-synth-lead',
    duration: '0:06',
    badge: 'bg-cyan-950/70 text-cyan-300 border border-cyan-800/60',
    btn: 'bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold',
  },
  {
    id: 'sample-lofi-keys',
    title: 'Vintage Rhodes MkII',
    category: 'KEYS / CHORDS',
    key: 'C min',
    bpm: '85 BPM',
    url: '/api/v1/media/stream?videoId=sample-lofi-keys',
    duration: '0:08',
    badge: 'bg-violet-950/70 text-violet-300 border border-violet-800/60',
    btn: 'bg-violet-600 hover:bg-violet-500 text-white font-semibold',
  },
  {
    id: 'sample-drums',
    title: 'Vinyl Breakbeat 1974',
    category: 'DRUM BREAK',
    key: 'Acoustic Kit',
    bpm: '90 BPM',
    url: '/api/v1/media/stream?videoId=sample-drums',
    duration: '0:04',
    badge: 'bg-amber-950/70 text-amber-300 border border-amber-800/60',
    btn: 'bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold',
  },
  {
    id: 'sample-acoustic',
    title: 'Warm Nylon Arp',
    category: 'ACOUSTIC GUITAR',
    key: 'E min',
    bpm: '110 BPM',
    url: '/api/v1/media/stream?videoId=sample-acoustic',
    duration: '0:08',
    badge: 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60',
    btn: 'bg-emerald-600 hover:bg-emerald-500 text-white font-semibold',
  },
  {
    id: 'sample-bass-groove',
    title: 'Analog Sub Funk',
    category: 'SUB BASS',
    key: 'D min',
    bpm: '115 BPM',
    url: '/api/v1/media/stream?videoId=sample-bass-groove',
    duration: '0:04',
    badge: 'bg-rose-950/70 text-rose-300 border border-rose-800/60',
    btn: 'bg-rose-600 hover:bg-rose-500 text-white font-semibold',
  },
];

export function WaveformTrimmer({ onOpenSourceModal }: WaveformTrimmerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const deckAudioRef = useRef<HTMLAudioElement | null>(null);

  const {
    sourceTrackInfo,
    sourceAudioBuffer,
    trimStartMs,
    trimEndMs,
    trimFadeInMs,
    trimFadeOutMs,
    trimVolume,
    isSnippetPlaying,
    tracks,
    selectedTrackId,
    setTrimRange,
    setTrimFadeIn,
    setTrimFadeOut,
    setTrimVolume,
    setIsSnippetPlaying,
    setSelectedTrackId,
    addClipToSelectedTrack,
    addDirectSampleClip,
    setSourceTrack,
    clearSourceTrack,
    setIsProcessingAudio,
  } = useStudioStore();

  const [snippetPlaybackMs, setSnippetPlaybackMs] = useState<number | null>(null);
  const [deckPreviewId, setDeckPreviewId] = useState<string | null>(null);
  const [addingSampleId, setAddingSampleId] = useState<string | null>(null);
  const [quickSearchInput, setQuickSearchInput] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const totalDurationSec = sourceAudioBuffer?.duration || 1;
  const totalDurationMs = Math.floor(totalDurationSec * 1000);

  // Clean up deck audio on unmount
  useEffect(() => {
    return () => {
      if (deckAudioRef.current) {
        deckAudioRef.current.pause();
        deckAudioRef.current = null;
      }
    };
  }, []);

  // Live playhead tracking during snippet preview
  useEffect(() => {
    if (!isSnippetPlaying) {
      setSnippetPlaybackMs(null);
      return;
    }

    const startEpoch = performance.now();
    const snippetDurMs = Math.max(100, trimEndMs - trimStartMs);
    let rafId: number;

    const tick = () => {
      const elapsed = performance.now() - startEpoch;
      if (elapsed >= snippetDurMs) {
        setSnippetPlaybackMs(null);
        return;
      }
      setSnippetPlaybackMs(trimStartMs + elapsed);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isSnippetPlaying, trimStartMs, trimEndMs]);

  // Render Waveform Canvas with interactive markers and live playhead
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sourceAudioBuffer) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const channelData = sourceAudioBuffer.getChannelData(0);
    const step = Math.ceil(channelData.length / width);
    const amp = height / 2;

    // Background dark chassis
    ctx.fillStyle = '#090b10';
    ctx.fillRect(0, 0, width, height);

    const inRatio = trimStartMs / totalDurationMs;
    const outRatio = trimEndMs / totalDurationMs;
    const inPx = inRatio * width;
    const outPx = outRatio * width;

    // Draw active snippet highlight background
    ctx.fillStyle = 'rgba(6, 182, 212, 0.16)';
    ctx.fillRect(inPx, 0, Math.max(2, outPx - inPx), height);

    // Draw waveform bars
    ctx.lineWidth = 1.5;
    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const datum = channelData[i * step + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }

      const isInsideTrim = i >= inPx && i <= outPx;
      ctx.strokeStyle = isInsideTrim ? '#22d3ee' : '#334155';

      ctx.beginPath();
      ctx.moveTo(i, (1 + min) * amp);
      ctx.lineTo(i, (1 + max) * amp);
      ctx.stroke();
    }

    // Draw Trim Boundary In/Out Lines
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(inPx - 1, 0, 2.5, height);
    ctx.fillRect(outPx - 1, 0, 2.5, height);

    // Draw Live Playhead when preview snippet is playing
    if (snippetPlaybackMs !== null) {
      const playheadRatio = Math.max(0, Math.min(1, snippetPlaybackMs / totalDurationMs));
      const playheadPx = playheadRatio * width;

      // Bright amber playhead line
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(playheadPx - 1, 0, 2.5, height);

      // Playhead top triangle indicator
      ctx.beginPath();
      ctx.moveTo(playheadPx - 5, 0);
      ctx.lineTo(playheadPx + 5, 0);
      ctx.lineTo(playheadPx, 8);
      ctx.fill();
    }
  }, [sourceAudioBuffer, trimStartMs, trimEndMs, totalDurationMs, snippetPlaybackMs]);

  const toggleDeckPreview = (sample: (typeof QUICK_SAMPLES)[0]) => {
    if (deckPreviewId === sample.id) {
      if (deckAudioRef.current) {
        deckAudioRef.current.pause();
        deckAudioRef.current = null;
      }
      setDeckPreviewId(null);
      return;
    }

    if (deckAudioRef.current) {
      deckAudioRef.current.pause();
    }

    const audio = new Audio(sample.url);
    deckAudioRef.current = audio;
    setDeckPreviewId(sample.id);

    audio.play().catch(() => setDeckPreviewId(null));
    audio.onended = () => setDeckPreviewId(null);
  };

  const handleQuickAdd = async (sample: (typeof QUICK_SAMPLES)[0]) => {
    setAddingSampleId(sample.id);
    try {
      await addDirectSampleClip(
        {
          id: sample.id,
          title: sample.title,
          url: sample.url,
          duration: sample.duration,
        },
        selectedTrackId
      );
      const targetName = tracks.find((t) => t.id === selectedTrackId)?.name || 'Track';
      setToastMsg(`✨ Added "${sample.title}" to ${targetName}!`);
      setTimeout(() => setToastMsg(null), 3500);
    } finally {
      setAddingSampleId(null);
    }
  };

  const handleQuickTrim = async (sample: (typeof QUICK_SAMPLES)[0]) => {
    if (deckAudioRef.current) {
      deckAudioRef.current.pause();
      deckAudioRef.current = null;
      setDeckPreviewId(null);
    }
    setIsProcessingAudio(true, `Loading "${sample.title}" into trimmer...`);
    try {
      const buffer = await audioEngine.decodeAudioFromUrl(sample.url);
      setSourceTrack(
        {
          id: sample.id,
          title: sample.title,
          url: sample.url,
          duration: sample.duration,
        },
        buffer
      );
    } catch (err) {
      console.warn('Failed to load sample into trimmer:', err);
    } finally {
      setIsProcessingAudio(false);
    }
  };

  const handlePlaySnippet = () => {
    if (!sourceAudioBuffer) return;

    if (isSnippetPlaying) {
      audioEngine.stopSnippet();
      setIsSnippetPlaying(false);
      setSnippetPlaybackMs(null);
      return;
    }

    const startSec = trimStartMs / 1000;
    const durationSec = (trimEndMs - trimStartMs) / 1000;

    setIsSnippetPlaying(true);
    audioEngine.playSnippet(sourceAudioBuffer, startSec, durationSec, trimVolume, () => {
      setIsSnippetPlaying(false);
      setSnippetPlaybackMs(null);
    });
  };

  const handleAddSnippet = () => {
    addClipToSelectedTrack();
    const targetName = tracks.find((t) => t.id === selectedTrackId)?.name || 'Track';
    setToastMsg(`✨ Added snippet to ${targetName}!`);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // State 1: When no song is loaded in trimmer, show the interactive Sound Vault & Sampler
  if (!sourceTrackInfo || !sourceAudioBuffer) {
    return (
      <Card className="border-slate-800 bg-[#12151e] shadow-xl overflow-hidden text-slate-100">
        {/* Header with Title & Quick YouTube Search Bar */}
        <div className="p-3 sm:p-4 bg-[#0a0c13] border-b border-slate-800/90 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-cyan-950/80 border border-cyan-800/60 text-cyan-400 flex items-center justify-center flex-shrink-0">
              <Music2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-slate-100 font-mono tracking-wide">
                  Sound Vault & Audio Sampler
                </h3>
                <span className="text-[10px] font-mono tracking-wider bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded">
                  44.1 kHz PCM
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Audition studio stems, extract hooks, or search YouTube audio directly into the arrangement.
              </p>
            </div>
          </div>

          {/* Quick YouTube Search Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onOpenSourceModal?.(quickSearchInput);
            }}
            className="flex items-center gap-1.5 w-full md:w-auto"
          >
            <div className="relative flex-1 md:w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={quickSearchInput}
                onChange={(e) => setQuickSearchInput(e.target.value)}
                placeholder="Search artist or song on YouTube..."
                className="w-full text-xs pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-700 bg-[#090b10] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              className="text-xs bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold shadow-sm flex-shrink-0 h-8"
            >
              Search
            </Button>
          </form>
        </div>

        {/* 5 Quick Sample Cards */}
        <div className="p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {QUICK_SAMPLES.map((sample) => {
              const isPreviewing = deckPreviewId === sample.id;
              const isAdding = addingSampleId === sample.id;

              return (
                <div
                  key={sample.id}
                  className="rounded-xl border border-slate-800/90 bg-[#0e121c] p-3 flex flex-col justify-between transition-all duration-200 hover:border-slate-700 hover:shadow-lg"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded tracking-wider ${sample.badge}`}>
                        {sample.category}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {sample.bpm}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-100 font-mono leading-tight mt-1">{sample.title}</h4>
                    <p className="text-[10px] font-mono text-slate-400 leading-tight mt-1">Key: {sample.key}</p>
                  </div>

                  <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => toggleDeckPreview(sample)}
                      className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all ${
                        isPreviewing
                          ? 'bg-amber-500 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                          : 'bg-slate-800/80 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                      title={isPreviewing ? 'Stop Audition' : 'Audition Stem'}
                    >
                      {isPreviewing ? (
                        <Square className="w-3 h-3 fill-current" />
                      ) : (
                        <Play className="w-3 h-3 fill-current ml-0.5" />
                      )}
                    </button>

                    <Button
                      size="sm"
                      onClick={() => handleQuickAdd(sample)}
                      isLoading={isAdding}
                      className={`flex-1 text-[11px] h-7 px-2 font-bold shadow-sm flex items-center justify-center ${sample.btn}`}
                      title={`Add to ${tracks.find((t) => t.id === selectedTrackId)?.name || 'Track'}`}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Insert
                    </Button>

                    <button
                      type="button"
                      onClick={() => handleQuickTrim(sample)}
                      className="h-7 w-7 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center"
                      title="Open in Waveform Trimmer"
                    >
                      <Scissors className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Toast Notification */}
          {toastMsg && (
            <div className="mt-3 p-2 bg-emerald-950/80 border border-emerald-700/60 rounded-lg text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{toastMsg}</span>
            </div>
          )}
        </div>
      </Card>
    );
  }

  // State 2: When a song is loaded in the trimmer, display the precision waveform trimmer
  const snippetDurationSec = ((trimEndMs - trimStartMs) / 1000).toFixed(2);

  const handleCanvasInteraction = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !sourceAudioBuffer) return;
    const rect = canvas.getBoundingClientRect();
    const clickRatio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const targetMs = Math.round(clickRatio * totalDurationMs);
    const distToStart = Math.abs(targetMs - trimStartMs);
    const distToEnd = Math.abs(targetMs - trimEndMs);

    if (distToStart < distToEnd) {
      setTrimRange(Math.min(targetMs, trimEndMs - 200), trimEndMs);
    } else {
      setTrimRange(trimStartMs, Math.max(targetMs, trimStartMs + 200));
    }
  };

  const nudgeStart = (deltaMs: number) => {
    const nextStart = Math.max(0, Math.min(trimEndMs - 200, trimStartMs + deltaMs));
    setTrimRange(nextStart, trimEndMs);
  };

  const nudgeEnd = (deltaMs: number) => {
    const nextEnd = Math.max(trimStartMs + 200, Math.min(totalDurationMs, trimEndMs + deltaMs));
    setTrimRange(trimStartMs, nextEnd);
  };

  const setPreset = (durationSec: number) => {
    const durMs = durationSec * 1000;
    const end = Math.min(totalDurationMs, trimStartMs + durMs);
    setTrimRange(trimStartMs, end);
  };

  return (
    <Card className="border-slate-800 bg-[#12151e] shadow-xl p-3 sm:p-4 text-slate-100">
      <CardHeader className="p-0 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Scissors className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span className="truncate">
              Waveform Sampler: <span className="text-cyan-400 font-mono">{sourceTrackInfo.title}</span>
            </span>
          </CardTitle>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
            Tap waveform or adjust sliders to extract hooks, riffs, or chord stems
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-mono font-bold bg-[#090b10] text-cyan-400 px-2.5 py-1 rounded-md border border-cyan-800/60">
            Snippet: {snippetDurationSec}s
          </span>
          <button
            type="button"
            onClick={clearSourceTrack}
            className="text-xs text-slate-400 hover:text-slate-200 font-medium px-2.5 py-1 rounded-md hover:bg-slate-800 flex items-center gap-1 border border-slate-700 bg-slate-800/60 transition-colors"
            title="Return to Sound Vault"
          >
            <X className="w-3.5 h-3.5" />
            <span>Sound Vault</span>
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-0 space-y-3.5">
        {/* Interactive Waveform Canvas with Touch & Click */}
        <div className="relative rounded-xl overflow-hidden bg-[#090b10] border border-slate-800 p-1">
          <canvas
            ref={canvasRef}
            width={800}
            height={90}
            onClick={(e) => handleCanvasInteraction(e.clientX)}
            onTouchStart={(e) => {
              if (e.touches[0]) handleCanvasInteraction(e.touches[0].clientX);
            }}
            className="w-full h-[85px] sm:h-[95px] block rounded-lg cursor-pointer touch-none"
            title="Tap on waveform to place start/end marker"
          />
          <div className="flex justify-between px-2 pt-1 text-[9px] text-slate-500 font-mono">
            <span>0:00</span>
            <span className="text-cyan-400 font-semibold">Tap waveform to position in/out cue markers</span>
            <span>{(totalDurationMs / 1000).toFixed(1)}s</span>
          </div>
        </div>

        {/* Quick Duration Presets for 1-Tap Mobile Selection */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-mono text-slate-400 mr-1">Presets:</span>
          <button
            type="button"
            onClick={() => setPreset(2)}
            className="px-2.5 py-1 text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-md border border-slate-700/80 font-mono transition-colors"
          >
            2s Hook
          </button>
          <button
            type="button"
            onClick={() => setPreset(4)}
            className="px-2.5 py-1 text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-md border border-slate-700/80 font-mono transition-colors"
          >
            4s Riff
          </button>
          <button
            type="button"
            onClick={() => setPreset(8)}
            className="px-2.5 py-1 text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-md border border-slate-700/80 font-mono transition-colors"
          >
            8s Loop
          </button>
          <button
            type="button"
            onClick={() => setTrimRange(0, totalDurationMs)}
            className="px-2.5 py-1 text-xs bg-slate-800/80 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 rounded-md border border-slate-700/80 font-mono transition-colors"
          >
            Full Track
          </button>
        </div>

        {/* Trim Sliders + Touch-Friendly Nudge Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#0a0c13] p-3 rounded-xl border border-slate-800">
          {/* Start Marker */}
          <div>
            <div className="flex justify-between items-center text-xs font-semibold text-slate-300 mb-1">
              <span className="font-mono text-slate-400">Start Cue (In)</span>
              <div className="flex items-center gap-1">
                <span className="font-mono text-cyan-400 mr-1.5">{(trimStartMs / 1000).toFixed(2)}s</span>
                <button
                  type="button"
                  onClick={() => nudgeStart(-500)}
                  className="px-1.5 py-0.5 text-[10px] bg-slate-800 border border-slate-700 rounded text-slate-300 hover:bg-slate-700 hover:text-white font-mono"
                  title="Nudge 0.5s left"
                >
                  -0.5s
                </button>
                <button
                  type="button"
                  onClick={() => nudgeStart(500)}
                  className="px-1.5 py-0.5 text-[10px] bg-slate-800 border border-slate-700 rounded text-slate-300 hover:bg-slate-700 hover:text-white font-mono"
                  title="Nudge 0.5s right"
                >
                  +0.5s
                </button>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(1, totalDurationMs - 200)}
              step={50}
              value={trimStartMs}
              onChange={(e) => setTrimRange(Number(e.target.value), trimEndMs)}
              className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* End Marker */}
          <div>
            <div className="flex justify-between items-center text-xs font-semibold text-slate-300 mb-1">
              <span className="font-mono text-slate-400">End Cue (Out)</span>
              <div className="flex items-center gap-1">
                <span className="font-mono text-cyan-400 mr-1.5">{(trimEndMs / 1000).toFixed(2)}s</span>
                <button
                  type="button"
                  onClick={() => nudgeEnd(-500)}
                  className="px-1.5 py-0.5 text-[10px] bg-slate-800 border border-slate-700 rounded text-slate-300 hover:bg-slate-700 hover:text-white font-mono"
                  title="Nudge 0.5s left"
                >
                  -0.5s
                </button>
                <button
                  type="button"
                  onClick={() => nudgeEnd(500)}
                  className="px-1.5 py-0.5 text-[10px] bg-slate-800 border border-slate-700 rounded text-slate-300 hover:bg-slate-700 hover:text-white font-mono"
                  title="Nudge 0.5s right"
                >
                  +0.5s
                </button>
              </div>
            </div>
            <input
              type="range"
              min={trimStartMs + 200}
              max={totalDurationMs}
              step={50}
              value={trimEndMs}
              onChange={(e) => setTrimRange(trimStartMs, Number(e.target.value))}
              className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Snippet Controls & Add to Timeline (Touch-Friendly Responsive Layout) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePlaySnippet}
              className="text-xs h-9 px-3 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700"
            >
              {isSnippetPlaying ? (
                <>
                  <Square className="w-3.5 h-3.5 mr-1.5 text-red-500 fill-current" />
                  Stop Preview
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 mr-1.5 fill-current text-cyan-400" />
                  Audition Snippet
                </>
              )}
            </Button>

            {/* Crossfade Controls */}
            <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-[#0a0c13] px-2.5 py-1 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400 font-mono">Fade:</span>
              <input
                type="number"
                min={0}
                max={1000}
                step={50}
                value={trimFadeInMs}
                onChange={(e) => setTrimFadeIn(Number(e.target.value))}
                className="w-12 px-1 py-0.5 text-xs border border-slate-700 rounded text-center bg-[#090b10] text-slate-100 font-mono"
                title="Fade-In duration in milliseconds"
              />
              <span className="text-slate-500 font-mono">ms</span>
            </div>
          </div>

          {/* Target Track & Insert Button */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedTrackId}
              onChange={(e) => setSelectedTrackId(e.target.value)}
              className="h-9 px-2.5 text-xs font-mono font-semibold border border-slate-700 rounded-lg bg-[#090b10] text-slate-200 flex-1 sm:flex-initial outline-none cursor-pointer"
            >
              {tracks.map((t) => (
                <option key={t.id} value={t.id} className="bg-[#12151e] text-slate-200">
                  Target: {t.name}
                </option>
              ))}
            </select>

            <Button
              size="sm"
              onClick={handleAddSnippet}
              className="text-xs h-9 px-4 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-950/40 flex items-center justify-center flex-1 sm:flex-initial"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add to Timeline
            </Button>
          </div>
        </div>

        {/* Toast Notification inside Trimmer */}
        {toastMsg && (
          <div className="p-2 bg-emerald-950/80 border border-emerald-700/60 rounded-lg text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
