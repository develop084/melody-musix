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

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Scissors className="w-4 h-4 text-blue-600" />
            Snippet Trimmer: <span className="text-blue-700">{sourceTrackInfo.title}</span>
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Trim in/out markers to extract riffs, chords, or vocal hooks for your medley
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-200">
            Length: {snippetDurationSec}s
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Interactive Waveform Canvas */}
        <div className="relative rounded-xl overflow-hidden bg-slate-900/5 border border-slate-200 p-1">
          <canvas
            ref={canvasRef}
            width={800}
            height={90}
            className="w-full h-[90px] block rounded-lg cursor-pointer"
          />
        </div>

        {/* Trim Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>Start In-Point</span>
              <span className="font-mono text-blue-600">{(trimStartMs / 1000).toFixed(2)}s</span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(1, totalDurationMs - 200)}
              step={50}
              value={trimStartMs}
              onChange={(e) => setTrimRange(Number(e.target.value), trimEndMs)}
              className="w-full accent-blue-600"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
              <span>End Out-Point</span>
              <span className="font-mono text-blue-600">{(trimEndMs / 1000).toFixed(2)}s</span>
            </div>
            <input
              type="range"
              min={trimStartMs + 200}
              max={totalDurationMs}
              step={50}
              value={trimEndMs}
              onChange={(e) => setTrimRange(trimStartMs, Number(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>
        </div>

        {/* Snippet Controls & Add to Timeline */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handlePlaySnippet} className="text-xs">
              {isSnippetPlaying ? (
                <>
                  <Square className="w-3.5 h-3.5 mr-1 text-red-600 fill-current" />
                  Stop Snippet
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 mr-1 fill-current" />
                  Play Snippet
                </>
              )}
            </Button>

            {/* Crossfade Controls */}
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="text-[11px] text-slate-500 font-medium">Fade:</span>
              <input
                type="number"
                min={0}
                max={1000}
                step={50}
                value={trimFadeInMs}
                onChange={(e) => setTrimFadeIn(Number(e.target.value))}
                className="w-14 px-1.5 py-1 text-xs border border-slate-200 rounded text-center"
                title="Fade-In duration in milliseconds"
              />
              <span className="text-slate-400">ms</span>
            </div>
          </div>

          {/* Target Track & Insert Button */}
          <div className="flex items-center gap-2">
            <select
              value={selectedTrackId}
              onChange={(e) => setSelectedTrackId(e.target.value)}
              className="h-8 px-2.5 text-xs font-medium border border-slate-300 rounded-lg bg-white"
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
              className="text-xs shadow-md shadow-blue-500/20"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Snippet to Timeline
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
