import React, { useRef } from 'react';
import { useStudioStore } from '../../stores/studioStore';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import {
  Volume2,
  Plus,
  Trash2,
  X,
  Copy,
  ChevronLeft,
  ChevronRight,
  Magnet,
} from 'lucide-react';

function TimelinePlayhead({ durationMs, showHandle = false }: { durationMs: number; showHandle?: boolean }) {
  const currentTimeMs = useStudioStore((s) => s.currentTimeMs);
  const playheadPercent = Math.min(100, Math.max(0, (currentTimeMs / durationMs) * 100));

  return (
    <div
      style={{ left: `${playheadPercent}%` }}
      className={`absolute top-0 bottom-0 w-0.5 bg-amber-400 pointer-events-none shadow-[0_0_8px_rgba(245,158,11,0.5)] ${
        showHandle ? 'z-30' : 'z-20'
      }`}
    >
      {showHandle && (
        <div className="w-3 h-3 bg-amber-400 -ml-1.5 rotate-45 transform origin-center shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
      )}
    </div>
  );
}

export function TimelineEditor() {
  const rulerRef = useRef<HTMLDivElement | null>(null);

  const {
    tracks,
    bpm,
    durationMs,
    selectedTrackId,
    isPlaying,
    snapToGrid,
    setSnapToGrid,
    duplicateClip,
    setSelectedTrackId,
    setCurrentTimeMs,
    removeClip,
    updateClipPosition,
    addTrack,
    removeTrack,
    setTrackVolume,
    toggleTrackMute,
    toggleTrackSolo,
  } = useStudioStore();

  const totalDurationSec = durationMs / 1000;

  // Snap to Grid calculations based on project BPM
  const beatMs = (60 / bpm) * 1000;
  const getSnapStepMs = () => {
    if (snapToGrid === '1/4') return beatMs; // 1 beat
    if (snapToGrid === '1/2') return beatMs * 2; // 2 beats
    if (snapToGrid === '1') return beatMs * 4; // 1 bar (4 beats)
    return 0;
  };

  const snapTime = (timeMs: number): number => {
    const step = getSnapStepMs();
    if (step <= 0) return timeMs;
    return Math.round(timeMs / step) * step;
  };

  const gridStepMs = getSnapStepMs();
  const gridTicks: number[] = [];
  if (gridStepMs > 0) {
    for (let ms = gridStepMs; ms < durationMs; ms += gridStepMs) {
      gridTicks.push((ms / durationMs) * 100);
    }
  }

  const handleScrub = (clientX: number) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    setCurrentTimeMs(ratio * durationMs);
  };

  // Generate tick marks for time ruler (adapts nicely on small screens)
  const ticks = [];
  const stepSec = totalDurationSec <= 30 ? 5 : 10;
  for (let s = 0; s <= totalDurationSec; s += stepSec) {
    const pct = (s / totalDurationSec) * 100;
    const mins = Math.floor(s / 60);
    const secs = (s % 60).toString().padStart(2, '0');
    ticks.push({ s, pct, label: `${mins}:${secs}` });
  }

  // Clip drag handler for desktop mouse
  const handleDragStart = (e: React.DragEvent, clipId: string, trackId: string, startMs: number) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ clipId, trackId, startMs, initialClientX: e.clientX }));
  };

  const handleLaneDrop = (e: React.DragEvent, trackId: string) => {
    e.preventDefault();
    const laneRect = e.currentTarget.getBoundingClientRect();
    const dropX = e.clientX - laneRect.left;
    const rawTargetMs = Math.max(0, Math.min(durationMs, (dropX / laneRect.width) * durationMs));
    const targetMs = snapTime(rawTargetMs);

    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data && data.clipId) {
        updateClipPosition(trackId, data.clipId, Math.floor(targetMs));
      }
    } catch {}
  };

  // Nudge clip position by delta (for mobile and touch screen users)
  const nudgeClip = (e: React.MouseEvent | React.TouchEvent, trackId: string, clipId: string, direction: -1 | 1) => {
    e.stopPropagation();
    const track = tracks.find((t) => t.id === trackId);
    if (!track) return;
    const clip = track.clips.find((c) => c.id === clipId);
    if (!clip) return;
    const step = getSnapStepMs() || 1000;
    const nextStart = Math.max(0, Math.min(durationMs - 200, snapTime(clip.timelineStartMs + direction * step)));
    updateClipPosition(trackId, clipId, nextStart);
  };

  const TRACK_ACCENTS = [
    {
      border: 'border-cyan-500/60',
      text: 'text-cyan-400',
      bar: 'bg-cyan-500',
      clipBg: 'bg-[#131b2e]',
      clipBorder: 'border-cyan-500/60',
      clipGlow: 'hover:border-cyan-400 shadow-cyan-950/40',
      chip: 'bg-cyan-950/70 border-cyan-800/60 text-cyan-300',
    },
    {
      border: 'border-violet-500/60',
      text: 'text-violet-400',
      bar: 'bg-violet-500',
      clipBg: 'bg-[#1b152e]',
      clipBorder: 'border-violet-500/60',
      clipGlow: 'hover:border-violet-400 shadow-violet-950/40',
      chip: 'bg-violet-950/70 border-violet-800/60 text-violet-300',
    },
    {
      border: 'border-amber-500/60',
      text: 'text-amber-400',
      bar: 'bg-amber-500',
      clipBg: 'bg-[#221810]',
      clipBorder: 'border-amber-500/60',
      clipGlow: 'hover:border-amber-400 shadow-amber-950/40',
      chip: 'bg-amber-950/70 border-amber-800/60 text-amber-300',
    },
    {
      border: 'border-emerald-500/60',
      text: 'text-emerald-400',
      bar: 'bg-emerald-500',
      clipBg: 'bg-[#102219]',
      clipBorder: 'border-emerald-500/60',
      clipGlow: 'hover:border-emerald-400 shadow-emerald-950/40',
      chip: 'bg-emerald-950/70 border-emerald-800/60 text-emerald-300',
    },
    {
      border: 'border-rose-500/60',
      text: 'text-rose-400',
      bar: 'bg-rose-500',
      clipBg: 'bg-[#25131c]',
      clipBorder: 'border-rose-500/60',
      clipGlow: 'hover:border-rose-400 shadow-rose-950/40',
      chip: 'bg-rose-950/70 border-rose-800/60 text-rose-300',
    },
  ];

  return (
    <Card className="border-slate-800 bg-[#12151e] shadow-2xl overflow-hidden text-slate-100">
      {/* Time Ruler & Master Playhead */}
      <div className="flex border-b border-slate-800 bg-[#090b10] select-none">
        {/* Left Track Title Column */}
        <div className="w-28 sm:w-44 md:w-56 p-2 sm:p-2.5 border-r border-slate-800 text-[10px] sm:text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between flex-shrink-0">
          <span className="truncate">Arrangement ({tracks.length})</span>
          <span className="text-[10px] font-mono text-slate-500 font-normal hidden sm:inline">Scrub</span>
        </div>

        {/* Right Ruler Area */}
        <div
          ref={rulerRef}
          onClick={(e) => handleScrub(e.clientX)}
          onTouchStart={(e) => {
            if (e.touches[0]) handleScrub(e.touches[0].clientX);
          }}
          className="flex-1 relative h-9 cursor-pointer overflow-hidden touch-none bg-[#090b10]"
        >
          {ticks.map((t) => (
            <div
              key={t.s}
              style={{ left: `${t.pct}%` }}
              className="absolute top-0 bottom-0 flex flex-col justify-between border-l border-slate-800 pointer-events-none pl-1"
            >
              <span className="text-[9px] sm:text-[10px] font-mono text-slate-500 font-semibold">{t.label}</span>
              <div className="h-1.5 w-0.5 bg-slate-700" />
            </div>
          ))}

          {/* Playhead Marker on Ruler */}
          <TimelinePlayhead durationMs={durationMs} showHandle />
        </div>
      </div>

      {/* Multitrack Lanes Workspace */}
      <div className="divide-y divide-slate-800/80 relative">
        {tracks.map((track, idx) => {
          const isSelected = track.id === selectedTrackId;
          const accent = TRACK_ACCENTS[idx % TRACK_ACCENTS.length];

          return (
            <div
              key={track.id}
              onClick={() => setSelectedTrackId(track.id)}
              className={`flex min-h-[86px] sm:min-h-[82px] transition-colors relative ${
                isSelected ? 'bg-slate-800/25 ring-1 ring-inset ring-slate-700/60' : 'hover:bg-slate-800/10'
              }`}
            >
              {/* Left Track Controls Header (Channel Strip) */}
              <div className="w-28 sm:w-44 md:w-56 p-2 sm:p-2.5 border-r border-slate-800 flex flex-col justify-between bg-[#0e121c] z-10 flex-shrink-0 relative">
                {/* Track Left Color Accent Edge */}
                <div className={`w-1 absolute left-0 top-0 bottom-0 ${accent.bar}`} />

                <div className="flex items-center justify-between gap-1 pl-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className={`text-[9px] font-mono font-bold px-1 py-0.5 rounded border ${accent.chip}`}>
                      CH{idx + 1}
                    </span>
                    <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-200 truncate">
                      {track.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTrackMute(track.id);
                      }}
                      className={`px-1.5 py-0.5 text-[9px] sm:text-[10px] font-mono font-bold rounded transition-all ${
                        track.muted
                          ? 'bg-red-950/80 border border-red-500 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                          : 'bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                      }`}
                      title={track.muted ? 'Track Muted (click to unmute)' : 'Mute Track'}
                    >
                      M
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTrackSolo(track.id);
                      }}
                      className={`px-1.5 py-0.5 text-[9px] sm:text-[10px] font-mono font-bold rounded transition-all ${
                        track.solo
                          ? 'bg-amber-950/80 border border-amber-500 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                          : 'bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                      }`}
                      title={track.solo ? 'Track Soloed (click to unsolo)' : 'Solo Track'}
                    >
                      S
                    </button>
                    {tracks.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTrack(track.id);
                        }}
                        className="text-slate-500 hover:text-red-400 p-0.5 ml-0.5 transition-colors"
                        title="Delete Track"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Track Volume Gain Slider */}
                <div className="flex items-center gap-1 sm:gap-2 mt-1.5 pl-1">
                  <Volume2 className="w-3 h-3 text-slate-500 flex-shrink-0" />
                  <input
                    type="range"
                    min={0}
                    max={1.5}
                    step={0.05}
                    value={track.volume}
                    onChange={(e) => setTrackVolume(track.id, Number(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    title={`Gain: ${Math.round(track.volume * 100)}%`}
                  />
                  <span className="text-[9px] sm:text-[10px] font-mono text-cyan-400 w-6 sm:w-8 text-right">
                    {Math.round(track.volume * 100)}%
                  </span>
                </div>
              </div>

              {/* Right Track Lane & Audio Clip Blocks */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleLaneDrop(e, track.id)}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  setCurrentTimeMs(clickRatio * durationMs);
                }}
                className="flex-1 relative h-full min-h-[86px] sm:min-h-[82px] bg-[#07090f] p-1.5 sm:p-2 overflow-hidden select-none cursor-pointer"
              >
                {/* Continuous Playhead Line across this lane */}
                <TimelinePlayhead durationMs={durationMs} />

                {/* Horizontal center guideline */}
                <div className="absolute inset-x-0 top-1/2 border-b border-dashed border-slate-800/40 pointer-events-none" />

                {/* Rhythmic Beat Grid Lines */}
                {gridTicks.map((pct, gridIdx) => (
                  <div
                    key={gridIdx}
                    style={{ left: `${pct}%` }}
                    className="absolute top-0 bottom-0 w-px border-r border-dashed border-slate-800/60 pointer-events-none z-0"
                  />
                ))}

                {track.clips.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] sm:text-[11px] font-mono text-slate-600 pointer-events-none px-2 text-center">
                    Tap to position playhead or click "Insert" on Sound Vault
                  </div>
                )}

                {track.clips.map((clip) => {
                  const leftPct = (clip.timelineStartMs / durationMs) * 100;
                  const widthPct = Math.max(5, (clip.durationMs / durationMs) * 100);

                  return (
                    <div
                      key={clip.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, clip.id, track.id, clip.timelineStartMs)}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                      }}
                      className={`absolute top-2 bottom-2 rounded-lg ${accent.clipBg} border ${accent.clipBorder} shadow-lg text-slate-100 p-1 sm:p-1.5 flex flex-col justify-between cursor-move group ${accent.clipGlow} transition-all z-10`}
                      title={`${clip.sourceTitle} (${(clip.durationMs / 1000).toFixed(1)}s)`}
                    >
                      <div className="flex items-center justify-between gap-1 overflow-hidden">
                        <span className={`text-[10px] sm:text-[11px] font-mono font-bold truncate leading-tight flex-1 ${accent.text}`}>
                          {clip.sourceTitle}
                        </span>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateClip(track.id, clip.id);
                            }}
                            className="bg-black/40 hover:bg-black/60 rounded p-0.5 text-slate-300 hover:text-white transition-colors"
                            title="Duplicate Clip (Repeat)"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeClip(track.id, clip.id);
                            }}
                            className="bg-black/40 hover:bg-black/60 rounded p-0.5 text-slate-300 hover:text-red-400 transition-colors"
                            title="Delete Clip"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Touch Nudge & Duration Bar (Works on Phones & Desktops) */}
                      <div className="flex items-center justify-between text-[9px] font-mono mt-0.5">
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={(e) => nudgeClip(e, track.id, clip.id, -1)}
                            className="bg-black/50 hover:bg-black/80 text-slate-300 hover:text-white rounded px-1 py-0.5 active:scale-95 font-mono"
                            title="Nudge Left by beat"
                          >
                            <ChevronLeft className="w-2.5 h-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => nudgeClip(e, track.id, clip.id, 1)}
                            className="bg-black/50 hover:bg-black/80 text-slate-300 hover:text-white rounded px-1 py-0.5 active:scale-95 font-mono"
                            title="Nudge Right by beat"
                          >
                            <ChevronRight className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        <span className="text-slate-400">{(clip.durationMs / 1000).toFixed(1)}s</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Track & Snap to Grid Action Bar */}
      <div className="p-2 sm:p-2.5 bg-[#090b10] border-t border-slate-800 flex flex-wrap justify-between items-center gap-2 text-xs">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => addTrack()}
            className="text-xs h-8 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700"
          >
            <Plus className="w-3.5 h-3.5 mr-1 text-cyan-400" />
            Add Audio Track
          </Button>

          {/* Rhythmic Snap Selector */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#0e121c] border border-slate-700 rounded-lg shadow-sm">
            <Magnet className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">Snap:</span>
            <select
              value={snapToGrid}
              onChange={(e) => setSnapToGrid(e.target.value as any)}
              className="text-xs font-mono font-semibold bg-transparent border-none outline-none cursor-pointer text-slate-200"
              title="Snap clips to musical grid beats"
            >
              <option value="off" className="bg-[#12151e] text-slate-200">Smooth (Off)</option>
              <option value="1/4" className="bg-[#12151e] text-slate-200">1 Beat</option>
              <option value="1/2" className="bg-[#12151e] text-slate-200">2 Beats</option>
              <option value="1" className="bg-[#12151e] text-slate-200">1 Bar</option>
            </select>
          </div>
        </div>

        <span className="text-slate-500 font-mono text-[10px] sm:text-[11px] truncate">
          Arrangement Matrix • Non-destructive Multi-stem Mixing • {bpm} BPM
        </span>
      </div>
    </Card>
  );
}
