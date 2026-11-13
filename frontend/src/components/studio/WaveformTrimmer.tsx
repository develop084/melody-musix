import React, { useRef, useEffect, useState } from 'react';
import { useStudioStore } from '../../stores/studioStore';
import { audioEngine } from '../../audio/audioEngine';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Tabs } from '../ui/Tabs';
import { WhatsAppShareModal } from './WhatsAppShareModal';
import {
  Scissors,
  Play,
  Square,
  Plus,
  Search,
  Music2,
  CheckCircle2,
  X,
  Share2,
  RotateCcw,
} from 'lucide-react';

export interface WaveformTrimmerProps {
  onOpenSourceModal?: (query?: string) => void;
}

export interface SampleItem {
  id: string;
  title: string;
  category: string;
  genre: 'all' | 'desi' | 'synth' | 'acoustic';
  key: string;
  bpm: string;
  url: string;
  duration: string;
}

const QUICK_SAMPLES: SampleItem[] = [
  // Indian / Desi Samples
  {
    id: 'sample-punjabi-dhol',
    title: 'Punjabi Dhol Beats',
    category: 'Dhol',
    genre: 'desi',
    key: 'Dhol Dagga',
    bpm: '98 BPM',
    url: '/api/v1/media/stream?videoId=sample-punjabi-dhol',
    duration: '0:04',
  },
  {
    id: 'sample-sitar-raga',
    title: 'Bollywood Sitar Raga',
    category: 'Sitar',
    genre: 'desi',
    key: 'Raga Yaman',
    bpm: '105 BPM',
    url: '/api/v1/media/stream?videoId=sample-sitar-raga',
    duration: '0:08',
  },
  {
    id: 'sample-desi-hiphop',
    title: 'Gully Boom-Bap Beat',
    category: 'Hip-Hop',
    genre: 'desi',
    key: 'Mumbai 808',
    bpm: '92 BPM',
    url: '/api/v1/media/stream?videoId=sample-desi-hiphop',
    duration: '0:04',
  },
  {
    id: 'sample-chai-lofi',
    title: 'Monsoon Chai Lo-Fi',
    category: 'Lo-Fi',
    genre: 'desi',
    key: 'C Maj Chords',
    bpm: '85 BPM',
    url: '/api/v1/media/stream?videoId=sample-chai-lofi',
    duration: '0:08',
  },
  // Core Stems
  {
    id: 'sample-synth-lead',
    title: 'Neon Poly Lead',
    category: 'Lead',
    genre: 'synth',
    key: 'F# min',
    bpm: '120 BPM',
    url: '/api/v1/media/stream?videoId=sample-synth-lead',
    duration: '0:06',
  },
  {
    id: 'sample-lofi-keys',
    title: 'Vintage Rhodes MkII',
    category: 'Keys',
    genre: 'synth',
    key: 'C min',
    bpm: '85 BPM',
    url: '/api/v1/media/stream?videoId=sample-lofi-keys',
    duration: '0:08',
  },
  {
    id: 'sample-drums',
    title: 'Vinyl Breakbeat 1974',
    category: 'Drums',
    genre: 'acoustic',
    key: 'Acoustic Kit',
    bpm: '90 BPM',
    url: '/api/v1/media/stream?videoId=sample-drums',
    duration: '0:04',
  },
  {
    id: 'sample-acoustic',
    title: 'Warm Nylon Arp',
    category: 'Guitar',
    genre: 'acoustic',
    key: 'E min',
    bpm: '110 BPM',
    url: '/api/v1/media/stream?videoId=sample-acoustic',
    duration: '0:08',
  },
  {
    id: 'sample-bass-groove',
    title: 'Analog Sub Funk',
    category: 'Bass',
    genre: 'synth',
    key: 'D min',
    bpm: '115 BPM',
    url: '/api/v1/media/stream?videoId=sample-bass-groove',
    duration: '0:04',
  },
];

export function WaveformTrimmer({ onOpenSourceModal }: WaveformTrimmerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const deckAudioRef = useRef<HTMLAudioElement | null>(null);
  const peaksRef = useRef<{ mins: Float32Array; maxs: Float32Array } | null>(null);

  const projectTitle = useStudioStore((s) => s.projectTitle);
  const bpm = useStudioStore((s) => s.bpm);
  const sourceTrackInfo = useStudioStore((s) => s.sourceTrackInfo);
  const sourceAudioBuffer = useStudioStore((s) => s.sourceAudioBuffer);
  const trimStartMs = useStudioStore((s) => s.trimStartMs);
  const trimEndMs = useStudioStore((s) => s.trimEndMs);
  const trimFadeInMs = useStudioStore((s) => s.trimFadeInMs);
  const trimVolume = useStudioStore((s) => s.trimVolume);
  const isSnippetPlaying = useStudioStore((s) => s.isSnippetPlaying);
  const tracks = useStudioStore((s) => s.tracks);
  const selectedTrackId = useStudioStore((s) => s.selectedTrackId);
  const setTrimRange = useStudioStore((s) => s.setTrimRange);
  const setTrimFadeIn = useStudioStore((s) => s.setTrimFadeIn);
  const setIsSnippetPlaying = useStudioStore((s) => s.setIsSnippetPlaying);
  const setSelectedTrackId = useStudioStore((s) => s.setSelectedTrackId);
  const addClipToSelectedTrack = useStudioStore((s) => s.addClipToSelectedTrack);
  const addDirectSampleClip = useStudioStore((s) => s.addDirectSampleClip);
  const setSourceTrack = useStudioStore((s) => s.setSourceTrack);
  const clearSourceTrack = useStudioStore((s) => s.clearSourceTrack);
  const setIsProcessingAudio = useStudioStore((s) => s.setIsProcessingAudio);

  const [snippetPlaybackMs, setSnippetPlaybackMs] = useState<number | null>(null);
  const [deckPreviewId, setDeckPreviewId] = useState<string | null>(null);
  const [addingSampleId, setAddingSampleId] = useState<string | null>(null);
  const [quickSearchInput, setQuickSearchInput] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'all' | 'desi' | 'synth' | 'acoustic'>('all');
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);

  const totalDurationSec = sourceAudioBuffer?.duration || 1;
  const totalDurationMs = Math.floor(totalDurationSec * 1000);

  // Background pre-load popular Indian presets in browser idle time for 0ms latency
  useEffect(() => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        audioEngine.preloadPresetUrls([
          '/api/v1/media/stream?videoId=sample-punjabi-dhol',
          '/api/v1/media/stream?videoId=sample-sitar-raga',
          '/api/v1/media/stream?videoId=sample-desi-hiphop',
          '/api/v1/media/stream?videoId=sample-chai-lofi',
        ]);
      });
    }
  }, []);

  // Clean up deck audio on unmount
  useEffect(() => {
    return () => {
      if (deckAudioRef.current) {
        deckAudioRef.current.pause();
        deckAudioRef.current = null;
      }
    };
  }, []);

  // Pre-calculate audio buffer peaks ONCE on buffer load (O(N) executed once, instead of 60x/sec!)
  useEffect(() => {
    if (!sourceAudioBuffer) {
      peaksRef.current = null;
      return;
    }
    const width = 850;
    const channelData = sourceAudioBuffer.getChannelData(0);
    const step = Math.ceil(channelData.length / width);
    const mins = new Float32Array(width);
    const maxs = new Float32Array(width);

    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;
      const start = i * step;
      const end = Math.min(channelData.length, start + step);
      for (let j = start; j < end; j++) {
        const datum = channelData[j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      mins[i] = min;
      maxs[i] = max;
    }
    peaksRef.current = { mins, maxs };
  }, [sourceAudioBuffer]);

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

  // Render Waveform Canvas in Light Theme (Zero buffer scan, uses precomputed peaks cache)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sourceAudioBuffer) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const amp = height / 2;

    // Background clean light chassis
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    const inRatio = trimStartMs / totalDurationMs;
    const outRatio = trimEndMs / totalDurationMs;
    const inPx = inRatio * width;
    const outPx = outRatio * width;

    // Active snippet highlight background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.07)';
    ctx.fillRect(inPx, 0, Math.max(2, outPx - inPx), height);

    // Draw waveform bars using pre-computed peaks cache
    const peaks = peaksRef.current;
    if (peaks) {
      ctx.lineWidth = 1.5;
      for (let i = 0; i < width; i++) {
        const isInsideTrim = i >= inPx && i <= outPx;
        ctx.strokeStyle = isInsideTrim ? '#0f172a' : '#cbd5e1';

        ctx.beginPath();
        ctx.moveTo(i, (1 + peaks.mins[i]) * amp);
        ctx.lineTo(i, (1 + peaks.maxs[i]) * amp);
        ctx.stroke();
      }
    }

    // Draw Trim Boundary In/Out Lines
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(inPx - 1, 0, 2, height);
    ctx.fillRect(outPx - 1, 0, 2, height);
  }, [sourceAudioBuffer, trimStartMs, trimEndMs, totalDurationMs]);

  const toggleDeckPreview = (sample: SampleItem) => {
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

  const handleQuickAdd = async (sample: SampleItem) => {
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
      setTimeout(() => setToastMsg(null), 3000);
    } finally {
      setAddingSampleId(null);
    }
  };

  const handleQuickTrim = async (sample: SampleItem) => {
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
    } catch {
      // Ignore
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
    setTimeout(() => setToastMsg(null), 3000);
  };

  // State 1: When no song is loaded in trimmer, show the interactive Sound Library & Sampler
  if (!sourceTrackInfo || !sourceAudioBuffer) {
    const filteredSamples = QUICK_SAMPLES.filter(
      (s) => activeCategory === 'all' || s.genre === activeCategory
    );

    return (
      <Card className="border-slate-200 bg-white shadow-xs overflow-hidden text-slate-900 rounded-xl">
        {/* Header with Title & YouTube Search Bar */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
              <Music2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-semibold text-slate-900 tracking-tight">
                  Sample Library
                </h3>
                <Badge variant="default" size="sm">
                  Presets
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Preview loops, trim audio clips, or add directly into your arrangement.
              </p>
            </div>
          </div>

          {/* Quick Search Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onOpenSourceModal?.(quickSearchInput);
            }}
            className="flex items-center gap-2 w-full md:w-auto"
          >
            <div className="relative flex-1 md:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={quickSearchInput}
                onChange={(e) => setQuickSearchInput(e.target.value)}
                placeholder="Search song / artist on YouTube..."
                className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 font-sans shadow-xs transition-all"
              />
            </div>
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              className="h-9 px-3.5 shrink-0"
            >
              Search
            </Button>
          </form>
        </div>

        {/* Category Tabs */}
        <div className="px-3.5 sm:px-4 pt-3 flex items-center justify-between flex-wrap gap-2">
          <Tabs
            tabs={[
              { id: 'all', label: 'All Sounds', count: QUICK_SAMPLES.length },
              { id: 'desi', label: 'Desi / Bollywood', count: 4 },
              { id: 'synth', label: 'Synths & Chords', count: 3 },
              { id: 'acoustic', label: 'Acoustic & Drums', count: 2 },
            ]}
            activeTab={activeCategory}
            onChange={(id) => setActiveCategory(id as any)}
            size="sm"
          />
        </div>

        {/* Sample Cards Grid */}
        <div className="p-3.5 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredSamples.map((sample) => {
              const isPreviewing = deckPreviewId === sample.id;
              const isAdding = addingSampleId === sample.id;

              return (
                <div
                  key={sample.id}
                  className="rounded-lg border border-slate-200 bg-white p-3.5 flex flex-col justify-between transition-colors hover:border-slate-300 group shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="default" size="sm">
                        {sample.category}
                      </Badge>
                      <span className="text-[11px] font-mono font-medium text-slate-500">
                        {sample.bpm}
                      </span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug">
                      {sample.title}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">Key: {sample.key}</p>
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => toggleDeckPreview(sample)}
                      className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                        isPreviewing
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                      }`}
                      title={isPreviewing ? 'Stop Preview' : 'Audition Loop'}
                    >
                      {isPreviewing ? (
                        <Square className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5 text-slate-700" />
                      )}
                    </button>

                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={() => handleQuickAdd(sample)}
                      isLoading={isAdding}
                      className="flex-1"
                      title={`Add to ${tracks.find((t) => t.id === selectedTrackId)?.name || 'Track'}`}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add to Track
                    </Button>

                    <button
                      type="button"
                      onClick={() => handleQuickTrim(sample)}
                      className="h-8 w-8 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                      title="Open in Waveform Trimmer"
                    >
                      <Scissors className="w-3.5 h-3.5 text-slate-600" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Toast Notification */}
          {toastMsg && (
            <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{toastMsg}</span>
            </div>
          )}
        </div>

        <WhatsAppShareModal
          isOpen={isWhatsAppOpen}
          onClose={() => setIsWhatsAppOpen(false)}
          projectTitle={projectTitle}
          durationMs={30000}
          bpm={bpm}
        />
      </Card>
    );
  }

  // State 2: When a song is loaded in the trimmer
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

  const setWhatsAppStatusPreset = () => {
    setPreset(30);
  };

  return (
    <Card className="border-slate-200 bg-white shadow-xs p-3.5 sm:p-4 text-slate-900 rounded-xl">
      <CardHeader className="p-0 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 space-y-0 border-b border-slate-100">
        <div>
          <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
            <Scissors className="w-4 h-4 text-slate-700 shrink-0" />
            <span>Audio Trimmer:</span>
            <span className="text-slate-900 font-semibold">{sourceTrackInfo.title}</span>
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Click on waveform to adjust the active region or choose a preset length.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <Badge variant="default" size="md">
            Duration: {snippetDurationSec}s
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearSourceTrack}
            leftIcon={<X className="w-3.5 h-3.5 text-slate-500" />}
          >
            Back to Library
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0 pt-3 space-y-3.5">
        {/* Interactive Waveform Canvas */}
        <div className="relative rounded-lg overflow-hidden bg-slate-50 border border-slate-200 p-1.5 shadow-xs">
          <canvas
            ref={canvasRef}
            width={850}
            height={96}
            onClick={(e) => handleCanvasInteraction(e.clientX)}
            onTouchStart={(e) => {
              if (e.touches[0]) handleCanvasInteraction(e.touches[0].clientX);
            }}
            className="w-full h-[90px] sm:h-[105px] block rounded-md cursor-pointer touch-none"
            title="Click waveform to set in/out cues"
          />

          {/* Dynamic Playhead */}
          {snippetPlaybackMs !== null && (
            <div
              style={{
                left: `${Math.max(0, Math.min(100, (snippetPlaybackMs / totalDurationMs) * 100))}%`,
              }}
              className="absolute top-1.5 bottom-7 w-0.5 bg-amber-500 pointer-events-none z-10 will-change-transform shadow-xs"
            >
              <div className="w-3.5 h-3.5 bg-amber-500 -ml-1.5 rotate-45 transform origin-center shadow-xs" />
            </div>
          )}
          <div className="flex justify-between px-2 pt-1.5 text-[10px] text-slate-500 font-mono">
            <span>0:00</span>
            <span className="text-slate-500 font-normal hidden sm:inline">
              Click waveform to adjust region
            </span>
            <span>{(totalDurationMs / 1000).toFixed(1)}s total</span>
          </div>
        </div>

        {/* Duration Presets */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
          <span className="font-medium text-slate-600 mr-1">
            Presets:
          </span>

          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={setWhatsAppStatusPreset}
          >
            30s Status
          </Button>

          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => setPreset(15)}
          >
            15s Ringtone
          </Button>

          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => setPreset(60)}
          >
            60s Short
          </Button>

          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => setPreset(8)}
          >
            8s Loop
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => setTrimRange(0, totalDurationMs)}
            leftIcon={<RotateCcw className="w-3 h-3 text-slate-500" />}
          >
            Full Track
          </Button>
        </div>

        {/* Trim Sliders + Nudge Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
          {/* Start Marker */}
          <div>
            <div className="flex justify-between items-center text-xs font-medium text-slate-700 mb-1.5">
              <span>Start (In)</span>
              <div className="flex items-center gap-1">
                <span className="font-mono text-slate-900 mr-1.5 font-semibold">
                  {(trimStartMs / 1000).toFixed(2)}s
                </span>
                <button
                  type="button"
                  onClick={() => nudgeStart(-500)}
                  className="px-2 py-0.5 text-xs bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 font-mono shadow-xs cursor-pointer"
                  title="Nudge 0.5s left"
                >
                  -0.5s
                </button>
                <button
                  type="button"
                  onClick={() => nudgeStart(500)}
                  className="px-2 py-0.5 text-xs bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 font-mono shadow-xs cursor-pointer"
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
              className="w-full accent-slate-900 h-2 bg-slate-200 rounded-lg cursor-pointer"
            />
          </div>

          {/* End Marker */}
          <div>
            <div className="flex justify-between items-center text-xs font-medium text-slate-700 mb-1.5">
              <span>End (Out)</span>
              <div className="flex items-center gap-1">
                <span className="font-mono text-slate-900 mr-1.5 font-semibold">
                  {(trimEndMs / 1000).toFixed(2)}s
                </span>
                <button
                  type="button"
                  onClick={() => nudgeEnd(-500)}
                  className="px-2 py-0.5 text-xs bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 font-mono shadow-xs cursor-pointer"
                  title="Nudge 0.5s left"
                >
                  -0.5s
                </button>
                <button
                  type="button"
                  onClick={() => nudgeEnd(500)}
                  className="px-2 py-0.5 text-xs bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100 font-mono shadow-xs cursor-pointer"
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
              className="w-full accent-slate-900 h-2 bg-slate-200 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Snippet Controls & Add to Track */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePlaySnippet}
              leftIcon={
                isSnippetPlaying ? (
                  <Square className="w-3.5 h-3.5 text-rose-600 fill-current" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current text-slate-700" />
                )
              }
            >
              {isSnippetPlaying ? 'Stop' : 'Preview Snippet'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsWhatsAppOpen(true)}
              leftIcon={<Share2 className="w-3.5 h-3.5 text-slate-600" />}
            >
              Share Clip
            </Button>

            {/* Crossfade Controls */}
            <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500">Fade:</span>
              <input
                type="number"
                min={0}
                max={1000}
                step={50}
                value={trimFadeInMs}
                onChange={(e) => setTrimFadeIn(Number(e.target.value))}
                className="w-12 px-1 py-0.5 text-xs border border-slate-300 rounded text-center bg-white text-slate-900 font-mono"
                title="Fade-In duration in ms"
              />
              <span className="text-slate-400 font-mono text-xs">ms</span>
            </div>
          </div>

          {/* Target Track & Insert Button */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedTrackId}
              onChange={(e) => setSelectedTrackId(e.target.value)}
              className="h-9 px-3 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-800 flex-1 sm:flex-initial outline-none cursor-pointer shadow-xs"
            >
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  Target: {t.name}
                </option>
              ))}
            </select>

            <Button
              variant="primary"
              size="sm"
              onClick={handleAddSnippet}
              leftIcon={<Plus className="w-4 h-4" />}
              className="flex-1 sm:flex-initial"
            >
              Add to Track
            </Button>
          </div>
        </div>

        {/* Toast Notification */}
        {toastMsg && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}
      </CardContent>

      <WhatsAppShareModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        projectTitle={sourceTrackInfo.title}
        durationMs={trimEndMs - trimStartMs}
        bpm={bpm}
      />
    </Card>
  );
}
