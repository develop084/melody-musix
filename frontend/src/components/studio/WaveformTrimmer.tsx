import React, { useRef, useEffect } from 'react';
import { useStudioStore } from '../../stores/studioStore';
import { audioEngine } from '../../audio/audioEngine';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import {
  Scissors,
  Play,
  Square,
  Plus,
  Volume2,
  Sliders,
  Sparkles,
} from 'lucide-react';

export interface WaveformTrimmerProps {
  onOpenSourceModal?: () => void;
}

export function WaveformTrimmer({ onOpenSourceModal }: WaveformTrimmerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
  } = useStudioStore();

  const totalDurationSec = sourceAudioBuffer?.duration || 1;
  const totalDurationMs = Math.floor(totalDurationSec * 1000);

  // Render Waveform Canvas
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

    const inRatio = trimStartMs / totalDurationMs;
    const outRatio = trimEndMs / totalDurationMs;
    const inPx = inRatio * width;
    const outPx = outRatio * width;

    // Draw active snippet highlight background
    ctx.fillStyle = 'rgba(59, 130, 246, 0.12)';
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
      ctx.strokeStyle = isInsideTrim ? '#2563eb' : '#94a3b8';

      ctx.beginPath();
      ctx.moveTo(i, (1 + min) * amp);
      ctx.lineTo(i, (1 + max) * amp);
      ctx.stroke();
    }

    // Draw Trim Boundary Lines
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(inPx - 1, 0, 3, height);
    ctx.fillRect(outPx - 1, 0, 3, height);
  }, [sourceAudioBuffer, trimStartMs, trimEndMs, totalDurationMs]);

  const handlePlaySnippet = () => {
    if (!sourceAudioBuffer) return;

    if (isSnippetPlaying) {
      audioEngine.stopSnippet();
      setIsSnippetPlaying(false);
      return;
    }

    const startSec = trimStartMs / 1000;
    const durationSec = (trimEndMs - trimStartMs) / 1000;

    setIsSnippetPlaying(true);
    audioEngine.playSnippet(sourceAudioBuffer, startSec, durationSec, trimVolume, () => {
      setIsSnippetPlaying(false);
    });
  };

  if (!sourceTrackInfo || !sourceAudioBuffer) {
    return (
      <Card className="border-dashed border-2 border-slate-200 bg-white">
        <CardContent className="py-7 text-center space-y-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
            <Scissors className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">No Song Loaded in Trimmer</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-0.5">
              Select or search a song on YouTube, or choose from our studio loops to extract snippets.
            </p>
          </div>
          {onOpenSourceModal && (
            <Button size="sm" onClick={onOpenSourceModal} className="text-xs bg-indigo-600 hover:bg-indigo-700 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Search YouTube / Browse Loops
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

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
    <Card className="border-slate-200 shadow-sm p-3 sm:p-4">
      <CardHeader className="p-0 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Scissors className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="truncate">Snippet Trimmer: <span className="text-blue-700">{sourceTrackInfo.title}</span></span>
          </CardTitle>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
            Tap waveform or adjust sliders to extract riffs, chords, or hooks
          </p>
        </div>
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-200">
            Snippet: {snippetDurationSec}s
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-0 space-y-3.5">
        {/* Interactive Waveform Canvas with Touch & Click */}
        <div className="relative rounded-xl overflow-hidden bg-slate-900/5 border border-slate-200 p-1">
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
          <div className="flex justify-between px-2 pt-1 text-[9px] text-slate-400 font-mono">
            <span>0:00</span>
            <span className="text-blue-600 font-semibold">Tap waveform to position markers</span>
            <span>{(totalDurationMs / 1000).toFixed(1)}s</span>
          </div>
        </div>

        {/* Quick Duration Presets for 1-Tap Mobile Selection */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-500 mr-1">Quick Presets:</span>
          <button
            type="button"
            onClick={() => setPreset(2)}
            className="px-2 py-0.5 text-xs bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-md border border-slate-200 font-medium transition-colors"
          >
            2s Hook
          </button>
          <button
            type="button"
            onClick={() => setPreset(4)}
            className="px-2 py-0.5 text-xs bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-md border border-slate-200 font-medium transition-colors"
          >
            4s Riff
          </button>
          <button
            type="button"
            onClick={() => setPreset(8)}
            className="px-2 py-0.5 text-xs bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-md border border-slate-200 font-medium transition-colors"
          >
            8s Loop
          </button>
          <button
            type="button"
            onClick={() => setTrimRange(0, totalDurationMs)}
            className="px-2 py-0.5 text-xs bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-md border border-slate-200 font-medium transition-colors"
          >
            Full Track
          </button>
        </div>

        {/* Trim Sliders + Touch-Friendly Nudge Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-100">
          {/* Start Marker */}
          <div>
            <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-1">
              <span>Start In-Point</span>
              <div className="flex items-center gap-1">
                <span className="font-mono text-blue-600 mr-1.5">{(trimStartMs / 1000).toFixed(2)}s</span>
                <button
                  type="button"
                  onClick={() => nudgeStart(-500)}
                  className="px-1.5 py-0.5 text-[10px] bg-white border border-slate-300 rounded hover:bg-slate-100"
                  title="Nudge 0.5s left"
                >
                  -0.5s
                </button>
                <button
                  type="button"
                  onClick={() => nudgeStart(500)}
                  className="px-1.5 py-0.5 text-[10px] bg-white border border-slate-300 rounded hover:bg-slate-100"
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
              className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
            />
          </div>

          {/* End Marker */}
          <div>
            <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-1">
              <span>End Out-Point</span>
              <div className="flex items-center gap-1">
                <span className="font-mono text-blue-600 mr-1.5">{(trimEndMs / 1000).toFixed(2)}s</span>
                <button
                  type="button"
                  onClick={() => nudgeEnd(-500)}
                  className="px-1.5 py-0.5 text-[10px] bg-white border border-slate-300 rounded hover:bg-slate-100"
                  title="Nudge 0.5s left"
                >
                  -0.5s
                </button>
                <button
                  type="button"
                  onClick={() => nudgeEnd(500)}
                  className="px-1.5 py-0.5 text-[10px] bg-white border border-slate-300 rounded hover:bg-slate-100"
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
              className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Snippet Controls & Add to Timeline (Touch-Friendly Responsive Layout) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePlaySnippet}
              className="text-xs h-9 px-3"
            >
              {isSnippetPlaying ? (
                <>
                  <Square className="w-3.5 h-3.5 mr-1.5 text-red-600 fill-current" />
                  Stop Preview
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                  Preview Snippet
                </>
              )}
            </Button>

            {/* Crossfade Controls */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium">Fade:</span>
              <input
                type="number"
                min={0}
                max={1000}
                step={50}
                value={trimFadeInMs}
                onChange={(e) => setTrimFadeIn(Number(e.target.value))}
                className="w-12 px-1 py-0.5 text-xs border border-slate-200 rounded text-center bg-white"
                title="Fade-In duration in milliseconds"
              />
              <span className="text-slate-400">ms</span>
            </div>
          </div>

          {/* Target Track & Insert Button */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedTrackId}
              onChange={(e) => setSelectedTrackId(e.target.value)}
              className="h-9 px-2.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white flex-1 sm:flex-initial"
            >
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  Target: {t.name}
                </option>
              ))}
            </select>

            <Button
              size="sm"
              onClick={() => addClipToSelectedTrack()}
              className="text-xs h-9 px-3.5 bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 text-white font-semibold flex items-center justify-center flex-1 sm:flex-initial"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add to Timeline
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
