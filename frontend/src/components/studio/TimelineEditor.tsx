import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useStudioStore, registerPlayheadListener } from '../../stores/studioStore';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import {
  Volume2,
  Plus,
  Trash2,
  X,
  Copy,
  Magnet,
  Music,
  GripVertical,
} from 'lucide-react';

// Zero-React overhead Playhead: updates DOM left position at 60/120fps with no component re-renders
function TimelinePlayhead({ durationMs, showHandle = false }: { durationMs: number; showHandle?: boolean }) {
  const lineRef = useRef<HTMLDivElement | null>(null);
  const currentTimeMs = useStudioStore((s) => s.currentTimeMs);

  useEffect(() => {
    // Initial position on mount or duration change
    if (lineRef.current) {
      const initialPct = Math.min(100, Math.max(0, (currentTimeMs / durationMs) * 100));
      lineRef.current.style.left = `${initialPct}%`;
    }

    // Direct RAF updates without triggering React reconciliation
    const unregister = registerPlayheadListener((_ms, pct) => {
      if (lineRef.current) {
        lineRef.current.style.left = `${pct}%`;
      }
    });
    return unregister;
  }, [durationMs, currentTimeMs]);

  const initialPct = Math.min(100, Math.max(0, (currentTimeMs / durationMs) * 100));

  return (
    <div
      ref={lineRef}
      style={{ left: `${initialPct}%` }}
      className={`absolute top-0 bottom-0 w-0.5 bg-amber-500 pointer-events-none will-change-transform shadow-xs ${
        showHandle ? 'z-30' : 'z-20'
      }`}
    >
      {showHandle && (
        <div className="w-3.5 h-3.5 bg-amber-500 -ml-1.5 rotate-45 transform origin-center shadow-sm" />
      )}
    </div>
  );
}

interface DragState {
  type: 'move' | 'trim-start' | 'trim-end';
  clipId: string;
  sourceTrackId: string;
  currentTrackId: string;
  startX: number;
  initialStartMs: number;
  initialDurationMs: number;
  initialOffsetMs: number;
  currentStartMs: number;
  currentDurationMs: number;
  currentOffsetMs: number;
}

export function TimelineEditor() {
  const rulerRef = useRef<HTMLDivElement | null>(null);
  const tracksContainerRef = useRef<HTMLDivElement | null>(null);

  // Granular Zustand selectors - ensures TimelineEditor does NOT re-render on playhead ticks!
  const tracks = useStudioStore((s) => s.tracks);
  const bpm = useStudioStore((s) => s.bpm);
  const durationMs = useStudioStore((s) => s.durationMs);
  const selectedTrackId = useStudioStore((s) => s.selectedTrackId);
  const snapToGrid = useStudioStore((s) => s.snapToGrid);
  const setSnapToGrid = useStudioStore((s) => s.setSnapToGrid);
  const duplicateClip = useStudioStore((s) => s.duplicateClip);
  const setSelectedTrackId = useStudioStore((s) => s.setSelectedTrackId);
  const setCurrentTimeMs = useStudioStore((s) => s.setCurrentTimeMs);
  const removeClip = useStudioStore((s) => s.removeClip);
  const updateClipPosition = useStudioStore((s) => s.updateClipPosition);
  const updateClipFraming = useStudioStore((s) => s.updateClipFraming);
  const addTrack = useStudioStore((s) => s.addTrack);
  const removeTrack = useStudioStore((s) => s.removeTrack);
  const setTrackVolume = useStudioStore((s) => s.setTrackVolume);
  const toggleTrackMute = useStudioStore((s) => s.toggleTrackMute);
  const toggleTrackSolo = useStudioStore((s) => s.toggleTrackSolo);

  // Smooth real-time pointer drag state
  const [activeDrag, setActiveDrag] = useState<DragState | null>(null);
  const [snapGuideX, setSnapGuideX] = useState<number | null>(null);

  const totalDurationSec = durationMs / 1000;

  // Snap to Grid calculations
  const beatMs = (60 / bpm) * 1000;
  const getSnapStepMs = useCallback(() => {
    if (snapToGrid === '1/4') return beatMs;
    if (snapToGrid === '1/2') return beatMs * 2;
    if (snapToGrid === '1') return beatMs * 4;
    return 0;
  }, [snapToGrid, beatMs]);

  const snapTime = useCallback((timeMs: number): number => {
    const step = getSnapStepMs();
    if (step <= 0) return timeMs;
    return Math.round(timeMs / step) * step;
  }, [getSnapStepMs]);

  // Global PointerMove & PointerUp listeners with RAF throttling for 60/120fps buttery-smooth dragging
  useEffect(() => {
    if (!activeDrag) return;

    let pendingRaf: number | null = null;
    let latestPointerEvent: PointerEvent | null = null;

    const processPointerMove = (e: PointerEvent) => {
      const ruler = rulerRef.current;
      if (!ruler) return;

      const rect = ruler.getBoundingClientRect();
      const laneWidth = rect.width;
      if (laneWidth <= 0) return;

      const deltaPx = e.clientX - activeDrag.startX;
      const deltaMs = (deltaPx / laneWidth) * durationMs;

      // Identify track under cursor for vertical moving
      let targetTrackId = activeDrag.sourceTrackId;
      if (tracksContainerRef.current) {
        const laneElements = tracksContainerRef.current.querySelectorAll<HTMLDivElement>('[data-track-id]');
        for (const el of Array.from(laneElements)) {
          const elRect = el.getBoundingClientRect();
          if (e.clientY >= elRect.top && e.clientY <= elRect.bottom) {
            targetTrackId = el.getAttribute('data-track-id') || targetTrackId;
            break;
          }
        }
      }

      if (activeDrag.type === 'move') {
        let newStartMs = Math.max(0, Math.min(durationMs - 200, activeDrag.initialStartMs + deltaMs));
        const snappedStart = snapTime(newStartMs);

        // Visual snap guide
        if (Math.abs(newStartMs - snappedStart) < 150) {
          newStartMs = snappedStart;
          setSnapGuideX((newStartMs / durationMs) * 100);
        } else {
          setSnapGuideX(null);
        }

        setActiveDrag((prev) => (prev ? { ...prev, currentStartMs: Math.round(newStartMs), currentTrackId: targetTrackId } : null));
      } else if (activeDrag.type === 'trim-end') {
        let newDurMs = Math.max(300, Math.min(durationMs - activeDrag.initialStartMs, activeDrag.initialDurationMs + deltaMs));
        const snappedEnd = snapTime(activeDrag.initialStartMs + newDurMs);
        if (Math.abs(activeDrag.initialStartMs + newDurMs - snappedEnd) < 150) {
          newDurMs = Math.max(300, snappedEnd - activeDrag.initialStartMs);
          setSnapGuideX(((activeDrag.initialStartMs + newDurMs) / durationMs) * 100);
        } else {
          setSnapGuideX(null);
        }

        setActiveDrag((prev) => (prev ? { ...prev, currentDurationMs: Math.round(newDurMs) } : null));
      } else if (activeDrag.type === 'trim-start') {
        const maxStartShift = activeDrag.initialDurationMs - 300;
        let shiftMs = Math.max(-activeDrag.initialOffsetMs, Math.min(maxStartShift, deltaMs));
        let newStartMs = Math.max(0, activeDrag.initialStartMs + shiftMs);
        let newOffsetMs = Math.max(0, activeDrag.initialOffsetMs + shiftMs);
        let newDurMs = Math.max(300, activeDrag.initialDurationMs - shiftMs);

        setActiveDrag((prev) =>
          prev
            ? {
                ...prev,
                currentStartMs: Math.round(newStartMs),
                currentDurationMs: Math.round(newDurMs),
                currentOffsetMs: Math.round(newOffsetMs),
              }
            : null
        );
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      latestPointerEvent = e;
      if (pendingRaf === null) {
        pendingRaf = requestAnimationFrame(() => {
          pendingRaf = null;
          if (latestPointerEvent) {
            processPointerMove(latestPointerEvent);
          }
        });
      }
    };

    const handlePointerUp = () => {
      if (pendingRaf !== null) {
        cancelAnimationFrame(pendingRaf);
        pendingRaf = null;
      }
      if (!activeDrag) return;

      if (activeDrag.type === 'move') {
        updateClipPosition(
          activeDrag.currentTrackId,
          activeDrag.clipId,
          activeDrag.currentStartMs,
          activeDrag.sourceTrackId
        );
      } else if (activeDrag.type === 'trim-end') {
        updateClipFraming(activeDrag.sourceTrackId, activeDrag.clipId, {
          durationMs: activeDrag.currentDurationMs,
        });
      } else if (activeDrag.type === 'trim-start') {
        updateClipFraming(activeDrag.sourceTrackId, activeDrag.clipId, {
          timelineStartMs: activeDrag.currentStartMs,
          durationMs: activeDrag.currentDurationMs,
          startOffsetMs: activeDrag.currentOffsetMs,
        });
      }

      setActiveDrag(null);
      setSnapGuideX(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      if (pendingRaf !== null) {
        cancelAnimationFrame(pendingRaf);
      }
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [activeDrag, durationMs, snapTime, updateClipPosition, updateClipFraming]);

  const handleScrub = (clientX: number) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    setCurrentTimeMs(ratio * durationMs);
  };

  // Generate tick marks for time ruler
  const ticks = [];
  const stepSec = totalDurationSec <= 30 ? 5 : 10;
  for (let s = 0; s <= totalDurationSec; s += stepSec) {
    const pct = (s / totalDurationSec) * 100;
    const mins = Math.floor(s / 60);
    const secs = (s % 60).toString().padStart(2, '0');
    ticks.push({ s, pct, label: `${mins}:${secs}` });
  }

  const gridStepMs = getSnapStepMs();
  const gridTicks: number[] = [];
  if (gridStepMs > 0) {
    for (let ms = gridStepMs; ms < durationMs; ms += gridStepMs) {
      gridTicks.push((ms / durationMs) * 100);
    }
  }

  // Clean theme colorways
  const TRACK_ACCENTS = [
    {
      bar: 'bg-slate-700',
      clipBg: 'bg-slate-50 border-slate-300 text-slate-900',
      chip: 'bg-slate-100 text-slate-800 border-slate-300',
      handle: 'hover:bg-slate-600',
      wave: 'bg-slate-400',
    },
    {
      bar: 'bg-blue-600',
      clipBg: 'bg-blue-50/90 border-blue-200 text-blue-950',
      chip: 'bg-blue-100 text-blue-800 border-blue-200',
      handle: 'hover:bg-blue-500',
      wave: 'bg-blue-400',
    },
    {
      bar: 'bg-emerald-600',
      clipBg: 'bg-emerald-50/90 border-emerald-200 text-emerald-950',
      chip: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      handle: 'hover:bg-emerald-500',
      wave: 'bg-emerald-400',
    },
    {
      bar: 'bg-amber-600',
      clipBg: 'bg-amber-50/90 border-amber-200 text-amber-950',
      chip: 'bg-amber-100 text-amber-800 border-amber-200',
      handle: 'hover:bg-amber-500',
      wave: 'bg-amber-400',
    },
  ];

  return (
    <Card className="border-slate-200 bg-white shadow-xs overflow-hidden rounded-xl select-none">
      {/* Time Ruler & Master Playhead */}
      <div className="flex border-b border-slate-200 bg-slate-50 select-none">
        {/* Left Track Title Column */}
        <div className="w-32 sm:w-44 md:w-56 p-2.5 sm:p-3 border-r border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wide flex items-center justify-between shrink-0">
          <span>Tracks ({tracks.length})</span>
        </div>

        {/* Right Ruler Area */}
        <div
          ref={rulerRef}
          onClick={(e) => handleScrub(e.clientX)}
          onTouchStart={(e) => {
            if (e.touches[0]) handleScrub(e.touches[0].clientX);
          }}
          className="flex-1 relative h-9 cursor-pointer overflow-hidden touch-none bg-slate-50 hover:bg-slate-100/50 transition-colors"
        >
          {ticks.map((t) => (
            <div
              key={t.s}
              style={{ left: `${t.pct}%` }}
              className="absolute top-0 bottom-0 flex flex-col justify-between border-l border-slate-200 pointer-events-none pl-1"
            >
              <span className="text-[10px] font-mono text-slate-500 font-medium">{t.label}</span>
              <div className="h-2 w-0.5 bg-slate-300" />
            </div>
          ))}

          {/* Magnetic Alignment Snap Line */}
          {snapGuideX !== null && (
            <div
              style={{ left: `${snapGuideX}%` }}
              className="absolute top-0 bottom-0 w-0.5 bg-slate-800 z-40 pointer-events-none shadow-sm"
            />
          )}

          {/* Isolated Fast Playhead */}
          <TimelinePlayhead durationMs={durationMs} showHandle />
        </div>
      </div>

      {/* Multitrack Lanes Workspace */}
      <div ref={tracksContainerRef} className="divide-y divide-slate-200 relative bg-slate-50/30">
        {tracks.map((track, idx) => {
          const isSelected = track.id === selectedTrackId;
          const accent = TRACK_ACCENTS[idx % TRACK_ACCENTS.length];

          return (
            <div
              key={track.id}
              data-track-id={track.id}
              onClick={() => setSelectedTrackId(track.id)}
              className={`flex min-h-[88px] sm:min-h-[84px] transition-colors relative ${
                isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/50'
              }`}
            >
              {/* Left Track Controls Strip */}
              <div className="w-32 sm:w-44 md:w-56 p-2.5 sm:p-3 border-r border-slate-200 flex flex-col justify-between bg-white z-10 shrink-0 relative shadow-xs">
                {/* Accent Color Edge */}
                <div className={`w-1 absolute left-0 top-0 bottom-0 ${accent.bar}`} />

                <div className="flex items-center justify-between gap-1 pl-1.5">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${accent.chip}`}>
                      CH{idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-slate-900 truncate">
                      {track.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTrackMute(track.id);
                      }}
                      className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded transition-colors cursor-pointer ${
                        track.muted
                          ? 'bg-rose-100 border border-rose-300 text-rose-700'
                          : 'bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-200'
                      }`}
                      title={track.muted ? 'Unmute' : 'Mute Track'}
                    >
                      M
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTrackSolo(track.id);
                      }}
                      className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded transition-colors cursor-pointer ${
                        track.solo
                          ? 'bg-amber-100 border border-amber-300 text-amber-800'
                          : 'bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-200'
                      }`}
                      title={track.solo ? 'Unsolo' : 'Solo Track'}
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
                        className="text-slate-400 hover:text-rose-600 p-0.5 ml-0.5 transition-colors cursor-pointer"
                        title="Delete Track"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Track Volume Gain Slider */}
                <div className="flex items-center gap-2 mt-2 pl-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input
                    type="range"
                    min={0}
                    max={1.5}
                    step={0.05}
                    value={track.volume}
                    onChange={(e) => setTrackVolume(track.id, Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                    title={`Volume: ${Math.round(track.volume * 100)}%`}
                  />
                  <span className="text-[10px] font-mono text-slate-600 w-7 text-right font-medium">
                    {Math.round(track.volume * 100)}%
                  </span>
                </div>
              </div>

              {/* Right Track Lane & Audio Clip Blocks */}
              <div
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  setCurrentTimeMs(clickRatio * durationMs);
                }}
                className="flex-1 relative h-full min-h-[88px] sm:min-h-[84px] bg-white p-2 overflow-hidden select-none cursor-pointer"
              >
                {/* Continuous Playhead Line */}
                <TimelinePlayhead durationMs={durationMs} />

                {/* Horizontal center guideline */}
                <div className="absolute inset-x-0 top-1/2 border-b border-dashed border-slate-200 pointer-events-none" />

                {/* Rhythmic Beat Grid Lines */}
                {gridTicks.map((pct, gridIdx) => (
                  <div
                    key={gridIdx}
                    style={{ left: `${pct}%` }}
                    className="absolute top-0 bottom-0 w-px border-r border-dashed border-slate-200/90 pointer-events-none z-0"
                  />
                ))}

                {track.clips.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 pointer-events-none px-2 text-center">
                    No clips on this track — select sounds from above to arrange
                  </div>
                )}

                {track.clips.map((clip) => {
                  const isBeingDragged = activeDrag?.clipId === clip.id;
                  const isOriginTrack = activeDrag?.sourceTrackId === track.id;

                  // Compute active real-time dragged coordinates
                  let currentStart = clip.timelineStartMs;
                  let currentDur = clip.durationMs;

                  if (isBeingDragged) {
                    if (activeDrag.currentTrackId !== track.id && isOriginTrack) {
                      // Being dragged to another track, hide here
                      return null;
                    }
                    currentStart = activeDrag.currentStartMs;
                    currentDur = activeDrag.currentDurationMs;
                  }

                  const leftPct = (currentStart / durationMs) * 100;
                  const widthPct = Math.max(5, (currentDur / durationMs) * 100);

                  return (
                    <div
                      key={clip.id}
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                      }}
                      className={`absolute top-2 bottom-2 rounded-lg border p-1.5 flex flex-col justify-between select-none transition-shadow z-10 ${accent.clipBg} ${
                        isBeingDragged
                          ? 'shadow-md ring-2 ring-slate-800 z-30 cursor-grabbing'
                          : 'shadow-xs hover:shadow-sm'
                      }`}
                    >
                      {/* Left Framing Handle (Trim In / Slip Start) */}
                      <div
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.currentTarget.setPointerCapture(e.pointerId);
                          setActiveDrag({
                            type: 'trim-start',
                            clipId: clip.id,
                            sourceTrackId: track.id,
                            currentTrackId: track.id,
                            startX: e.clientX,
                            initialStartMs: clip.timelineStartMs,
                            initialDurationMs: clip.durationMs,
                            initialOffsetMs: clip.startOffsetMs || 0,
                            currentStartMs: clip.timelineStartMs,
                            currentDurationMs: clip.durationMs,
                            currentOffsetMs: clip.startOffsetMs || 0,
                          });
                        }}
                        className={`absolute left-0 top-0 bottom-0 w-2.5 rounded-l-xl cursor-ew-resize flex items-center justify-center text-slate-400 transition-colors z-20 ${accent.handle}`}
                        title="Drag left edge to frame start of clip"
                      >
                        <div className="w-0.5 h-3 bg-slate-400/80 rounded" />
                      </div>

                      {/* Clip Body (Draggable for Move) */}
                      <div
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.currentTarget.setPointerCapture(e.pointerId);
                          setActiveDrag({
                            type: 'move',
                            clipId: clip.id,
                            sourceTrackId: track.id,
                            currentTrackId: track.id,
                            startX: e.clientX,
                            initialStartMs: clip.timelineStartMs,
                            initialDurationMs: clip.durationMs,
                            initialOffsetMs: clip.startOffsetMs || 0,
                            currentStartMs: clip.timelineStartMs,
                            currentDurationMs: clip.durationMs,
                            currentOffsetMs: clip.startOffsetMs || 0,
                          });
                        }}
                        className="flex items-center justify-between gap-1 px-1.5 cursor-grab active:cursor-grabbing flex-1"
                        title="Drag clip body horizontally or vertically to move"
                      >
                        <span className="text-[11px] font-medium truncate flex items-center gap-1 text-slate-900">
                          <Music className="w-3 h-3 text-slate-500 shrink-0" />
                          {clip.sourceTitle}
                        </span>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateClip(track.id, clip.id);
                            }}
                            className="text-slate-400 hover:text-slate-800 p-0.5 rounded transition-colors cursor-pointer"
                            title="Duplicate clip"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeClip(track.id, clip.id);
                            }}
                            className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors cursor-pointer"
                            title="Delete clip"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Right Framing Handle (Trim Out / Extend) */}
                      <div
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.currentTarget.setPointerCapture(e.pointerId);
                          setActiveDrag({
                            type: 'trim-end',
                            clipId: clip.id,
                            sourceTrackId: track.id,
                            currentTrackId: track.id,
                            startX: e.clientX,
                            initialStartMs: clip.timelineStartMs,
                            initialDurationMs: clip.durationMs,
                            initialOffsetMs: clip.startOffsetMs || 0,
                            currentStartMs: clip.timelineStartMs,
                            currentDurationMs: clip.durationMs,
                            currentOffsetMs: clip.startOffsetMs || 0,
                          });
                        }}
                        className={`absolute right-0 top-0 bottom-0 w-2.5 rounded-r-lg cursor-ew-resize flex items-center justify-center text-slate-400 transition-colors z-20 ${accent.handle}`}
                        title="Drag right edge to trim length of clip"
                      >
                        <div className="w-0.5 h-3 bg-slate-400/80 rounded" />
                      </div>

                      {/* Bottom Info Bar: Timing feedback */}
                      <div className="flex items-center justify-between text-[10px] font-mono px-1.5 text-slate-600 pointer-events-none">
                        <span>{(currentStart / 1000).toFixed(1)}s</span>
                        <span className="font-medium text-slate-700">
                          {(currentDur / 1000).toFixed(1)}s
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Ghost Preview when moving a clip into this track from another track */}
                {activeDrag && activeDrag.currentTrackId === track.id && activeDrag.sourceTrackId !== track.id && (
                  <div
                    style={{
                      left: `${(activeDrag.currentStartMs / durationMs) * 100}%`,
                      width: `${Math.max(5, (activeDrag.currentDurationMs / durationMs) * 100)}%`,
                    }}
                    className="absolute top-2 bottom-2 rounded-lg border-2 border-dashed border-slate-400 bg-slate-100/60 p-2 z-20 pointer-events-none flex items-center justify-center text-xs font-medium text-slate-800"
                  >
                    Move to Track
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Bar (Add Track & Beat Snap) */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap justify-between items-center gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => addTrack()}
            leftIcon={<Plus className="w-3.5 h-3.5 text-slate-600" />}
          >
            Add Track
          </Button>

          {/* Rhythmic Snap Selector */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg shadow-xs">
            <Magnet className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs text-slate-600 hidden sm:inline">Snap:</span>
            <select
              value={snapToGrid}
              onChange={(e) => setSnapToGrid(e.target.value as any)}
              className="text-xs font-medium bg-transparent border-none outline-none cursor-pointer text-slate-800"
              title="Snap clips to musical grid beats"
            >
              <option value="off">Off (Smooth)</option>
              <option value="1/4">1 Beat</option>
              <option value="1/2">2 Beats</option>
              <option value="1">1 Bar (4 Beats)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="default" size="sm">
            {bpm} BPM
          </Badge>
          <span className="text-slate-500 text-xs hidden sm:inline">
            Drag clip to move • Drag edges to trim
          </span>
        </div>
      </div>
    </Card>
  );
}
