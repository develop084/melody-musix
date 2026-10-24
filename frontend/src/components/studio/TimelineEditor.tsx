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

export function TimelineEditor() {
  const rulerRef = useRef<HTMLDivElement | null>(null);

  const {
    tracks,
    bpm,
    durationMs,
    currentTimeMs,
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
  const playheadPercent = Math.min(100, Math.max(0, (currentTimeMs / durationMs) * 100));

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

  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
      {/* Time Ruler & Master Playhead */}
      <div className="flex border-b border-slate-200 bg-slate-50 select-none">
        {/* Left Track Title Column */}
        <div className="w-28 sm:w-44 md:w-56 p-2 sm:p-2.5 border-r border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between flex-shrink-0">
          <span className="truncate">Tracks ({tracks.length})</span>
          <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">Scrub</span>
        </div>

        {/* Right Ruler Area */}
        <div
          ref={rulerRef}
          onClick={(e) => handleScrub(e.clientX)}
          onTouchStart={(e) => {
            if (e.touches[0]) handleScrub(e.touches[0].clientX);
          }}
          className="flex-1 relative h-9 cursor-pointer overflow-hidden touch-none"
        >
          {ticks.map((t) => (
            <div
              key={t.s}
              style={{ left: `${t.pct}%` }}
              className="absolute top-0 bottom-0 flex flex-col justify-between border-l border-slate-200/80 pointer-events-none pl-1"
            >
              <span className="text-[9px] sm:text-[10px] font-mono text-slate-400 font-semibold">{t.label}</span>
              <div className="h-1.5 w-0.5 bg-slate-300" />
            </div>
          ))}

          {/* Playhead Marker on Ruler */}
          <div
            style={{ left: `${playheadPercent}%` }}
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none transition-all duration-75"
          >
            <div className="w-3 h-3 bg-red-500 -ml-1.5 rotate-45 transform origin-center shadow-sm" />
          </div>
        </div>
      </div>

      {/* Multitrack Lanes Workspace */}
      <div className="divide-y divide-slate-100 relative">
        {tracks.map((track) => {
          const isSelected = track.id === selectedTrackId;

          return (
            <div
              key={track.id}
              onClick={() => setSelectedTrackId(track.id)}
              className={`flex min-h-[86px] sm:min-h-[82px] transition-colors ${
                isSelected ? 'bg-blue-50/20' : 'hover:bg-slate-50/40'
              }`}
            >
              {/* Left Track Controls Header (Mobile Compact) */}
              <div className="w-28 sm:w-44 md:w-56 p-2 sm:p-2.5 border-r border-slate-200 flex flex-col justify-between bg-white z-10 flex-shrink-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] sm:text-xs font-bold text-slate-900 truncate">
                    {track.name}
                  </span>
                  <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTrackMute(track.id);
                      }}
                      className={`px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold rounded ${
                        track.muted ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      title="Mute Track"
                    >
                      M
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTrackSolo(track.id);
                      }}
                      className={`px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold rounded ${
                        track.solo ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      title="Solo Track"
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
                        className="text-slate-300 hover:text-red-500 p-0.5"
                        title="Delete Track"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Track Volume Gain Slider */}
                <div className="flex items-center gap-1 sm:gap-2 mt-1.5">
                  <Volume2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  <input
                    type="range"
                    min={0}
                    max={1.5}
                    step={0.05}
                    value={track.volume}
                    onChange={(e) => setTrackVolume(track.id, Number(e.target.value))}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    title={`Volume: ${Math.round(track.volume * 100)}%`}
                  />
                  <span className="text-[9px] sm:text-[10px] font-mono text-slate-400 w-5 sm:w-7 text-right">
                    {Math.round(track.volume * 100)}%
                  </span>
                </div>
              </div>

              {/* Right Track Lane & Audio Clip Blocks with Pure Flex Playhead */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleLaneDrop(e, track.id)}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  setCurrentTimeMs(clickRatio * durationMs);
                }}
                className="flex-1 relative h-full min-h-[86px] sm:min-h-[82px] bg-slate-50/50 p-1.5 sm:p-2 overflow-hidden select-none cursor-pointer"
              >
                {/* Continuous Playhead Line across this lane */}
                <div
                  style={{ left: `${playheadPercent}%` }}
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none transition-all duration-75"
                />

                {/* Horizontal grid guide line */}
                <div className="absolute inset-x-0 top-1/2 border-b border-dashed border-slate-200/60 pointer-events-none" />

                {/* Rhythmic Beat Grid Lines */}
                {gridTicks.map((pct, idx) => (
                  <div
                    key={idx}
                    style={{ left: `${pct}%` }}
                    className="absolute top-0 bottom-0 w-px border-r border-dashed border-slate-200/70 pointer-events-none z-0"
                  />
                ))}

                {track.clips.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] sm:text-[11px] text-slate-300 pointer-events-none px-2 text-center">
                    Tap to position or select track & click "Add to Timeline"
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
                      className="absolute top-2 bottom-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm p-1 sm:p-1.5 flex flex-col justify-between cursor-move group hover:brightness-105 transition-all border border-blue-400/30 z-10"
                      title={`${clip.sourceTitle} (${(clip.durationMs / 1000).toFixed(1)}s)`}
                    >
                      <div className="flex items-center justify-between gap-1 overflow-hidden">
                        <span className="text-[10px] sm:text-[11px] font-bold truncate leading-tight flex-1">
                          {clip.sourceTitle}
                        </span>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateClip(track.id, clip.id);
                            }}
                            className="hover:bg-black/30 rounded p-0.5 text-white/90 hover:text-white"
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
                            className="hover:bg-black/30 rounded p-0.5 text-white/90 hover:text-white"
                            title="Delete Clip"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Touch Nudge & Duration Bar (Works on Phones & Desktops) */}
                      <div className="flex items-center justify-between text-[9px] text-blue-100 font-mono mt-0.5">
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={(e) => nudgeClip(e, track.id, clip.id, -1)}
                            className="bg-black/30 hover:bg-black/50 rounded px-1 py-0.5 active:scale-95"
                            title="Nudge Left"
                          >
                            <ChevronLeft className="w-2.5 h-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => nudgeClip(e, track.id, clip.id, 1)}
                            className="bg-black/30 hover:bg-black/50 rounded px-1 py-0.5 active:scale-95"
                            title="Nudge Right"
                          >
                            <ChevronRight className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        <span>{(clip.durationMs / 1000).toFixed(1)}s</span>
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
      <div className="p-2 sm:p-2.5 bg-slate-50/75 border-t border-slate-200 flex flex-wrap justify-between items-center gap-2 text-xs">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => addTrack()} className="text-xs h-8">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Audio Track
          </Button>

          {/* Rhythmic Snap Selector */}
          <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-lg shadow-sm">
            <Magnet className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[11px] font-semibold text-slate-600 hidden sm:inline">Snap:</span>
            <select
              value={snapToGrid}
              onChange={(e) => setSnapToGrid(e.target.value as any)}
              className="text-xs font-semibold bg-transparent border-none outline-none cursor-pointer text-slate-800"
              title="Snap clips to musical grid beats"
            >
              <option value="off">Smooth (Off)</option>
              <option value="1/4">1 Beat</option>
              <option value="1/2">2 Beats</option>
              <option value="1">1 Bar</option>
            </select>
          </div>
        </div>

        <span className="text-slate-400 text-[10px] sm:text-[11px] truncate">
          Arrangement Timeline • Non-destructive Mixing • {bpm} BPM
        </span>
      </div>
    </Card>
  );
}
