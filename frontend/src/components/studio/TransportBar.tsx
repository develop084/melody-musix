import React, { useState, useEffect } from 'react';
import { useStudioStore } from '../../stores/studioStore';
import { renderAndExportAudio, AudioExportFormat, downloadBlob } from '../../audio/mp3Exporter';
import { projectsApi } from '../../api/projects';
import { MasterVisualizer } from './MasterVisualizer';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import {
  Play,
  Pause,
  Square,
  Repeat,
  Download,
  Save,
  FolderOpen,
  Clock,
  Sparkles,
  CheckCircle2,
  Loader2,
  Undo2,
  Redo2,
  SlidersHorizontal,
  RotateCcw,
  Timer,
  HelpCircle,
  Keyboard,
} from 'lucide-react';

interface TransportBarProps {
  onOpenProjects: () => void;
  onOpenSourceModal: () => void;
}

function TimeDisplay() {
  const currentTimeMs = useStudioStore((s) => s.currentTimeMs);
  const durationMs = useStudioStore((s) => s.durationMs);

  const totalSec = Math.floor(currentTimeMs / 1000);
  const mins = Math.floor(totalSec / 60)
    .toString()
    .padStart(2, '0');
  const secs = (totalSec % 60).toString().padStart(2, '0');
  const millis = Math.floor((currentTimeMs % 1000) / 100);

  const durTotalSec = Math.floor(durationMs / 1000);
  const durMins = Math.floor(durTotalSec / 60)
    .toString()
    .padStart(2, '0');
  const durSecs = (durTotalSec % 60).toString().padStart(2, '0');

  return (
    <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-[#07090e] border border-slate-800 text-white font-mono text-xs sm:text-sm tracking-wider shadow-inner ring-1 ring-slate-800/60">
      <Clock className="w-3.5 h-3.5 text-cyan-400 hidden sm:inline" />
      <span className="text-emerald-400 font-bold tracking-widest">{mins}:{secs}.{millis}</span>
      <span className="text-slate-600">/</span>
      <span className="text-slate-400">{durMins}:{durSecs}</span>
    </div>
  );
}

export function TransportBar({ onOpenProjects, onOpenSourceModal }: TransportBarProps) {
  const {
    projectTitle,
    tracks,
    bpm,
    durationMs,
    isPlaying,
    isLooping,
    toggleLoop,
    isMetronomeActive,
    toggleMetronome,
    masterFilterFreq,
    setMasterFilterFreq,
    canUndo,
    canRedo,
    undo,
    redo,
    isProcessingAudio,
    processingStatus,
    setProjectTitle,
    setBpm,
    setDurationMs,
    playMasterTimeline,
    stopMasterTimeline,
    setCurrentTimeMs,
    loadDemoProject,
  } = useStudioStore();

  const [exportFormat, setExportFormat] = useState<AudioExportFormat>('mp3-192');
  const [showFilterControl, setShowFilterControl] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Global Undo / Redo keyboard shortcuts (Ctrl+Z / Cmd+Z, Ctrl+Y / Cmd+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          if (canRedo) redo();
        } else {
          e.preventDefault();
          if (canUndo) undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        if (canRedo) redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undo, redo]);

  const handleTogglePlay = () => {
    if (isPlaying) {
      stopMasterTimeline();
    } else {
      playMasterTimeline();
    }
  };

  const handleStop = () => {
    stopMasterTimeline();
    setCurrentTimeMs(0);
  };

  const handleExport = async () => {
    const totalClips = tracks.reduce((acc, t) => acc + t.clips.length, 0);
    if (totalClips === 0) {
      alert('Your timeline is empty! Add clips or click "1-Click Demo" first before exporting.');
      return;
    }

    setIsExporting(true);
    setExportProgress(5);

    try {
      const { blob, extension } = await renderAndExportAudio(tracks, durationMs, exportFormat, (pct) => {
        setExportProgress(pct);
      });

      const safeFilename = `${projectTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}.${extension}`;
      downloadBlob(blob, safeFilename);

      setNotification(`🎉 Successfully exported & downloaded "${safeFilename}"!`);
      setTimeout(() => setNotification(null), 5000);
    } catch (err: any) {
      alert(`Audio Export failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const handleSaveProject = async () => {
    setIsSaving(true);
    try {
      await projectsApi.create({
        title: projectTitle,
        bpm,
        durationMs,
        tracks,
      });
      setNotification(`Saved project "${projectTitle}"!`);
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      alert(`Failed to save project: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadDemo = async () => {
    setIsLoadingDemo(true);
    try {
      await loadDemoProject();
      setNotification('Arrangement template loaded into timeline.');
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      alert('Failed to load demo template');
    } finally {
      setIsLoadingDemo(false);
    }
  };

  return (
    <Card className="border-slate-800 bg-[#12151e] shadow-2xl p-3 sm:p-4 text-slate-100">
      <div className="flex flex-col gap-3">
        {/* Row 1: Channel Title input & Master Console Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase px-1.5 py-0.5 rounded bg-[#090b10] border border-slate-800">
              SESSION
            </span>
            <input
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              className="text-sm sm:text-base font-bold text-slate-100 bg-[#090b10] border border-slate-800 hover:border-slate-700 focus:border-cyan-500 focus:outline-none px-2.5 py-1 rounded-lg transition-colors max-w-xs font-mono"
              placeholder="Session Name"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsShortcutsOpen(true)}
              className="text-xs border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-750 flex items-center font-medium h-8 px-2.5"
              title="Keyboard & Touch Shortcuts"
            >
              <HelpCircle className="w-3.5 h-3.5 sm:mr-1 text-slate-400" />
              <span className="hidden sm:inline">Shortcuts</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadDemo}
              isLoading={isLoadingDemo}
              className="text-xs border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700 shadow-sm flex items-center font-medium h-8 px-2.5"
              title="Load standard 3-track arrangement template"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
              Demo Template
            </Button>

            <Button
              size="sm"
              onClick={onOpenSourceModal}
              className="text-xs bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-950/40 flex items-center justify-center h-8 px-3"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
              Import Audio / YouTube
            </Button>
          </div>
        </div>

        {/* Row 2: Playback Transport, Undo/Redo & Actions (Fully Responsive) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-800/80">
          {/* Playback & Undo/Redo & Visualizer cluster */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <Button
              size="md"
              onClick={handleTogglePlay}
              className={`h-9 w-11 sm:h-10 sm:w-12 p-0 shadow-lg transition-all ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_16px_rgba(245,158,11,0.4)]'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_16px_rgba(16,185,129,0.35)]'
              }`}
              title={isPlaying ? 'Pause Timeline (Space)' : 'Play Timeline (Space)'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleStop}
              className="h-9 w-9 p-0 bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700/80"
              title="Stop & Return to Start"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </Button>

            {/* Loop Toggle Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleLoop}
              className={`h-9 w-9 p-0 transition-all ${
                isLooping
                  ? 'bg-amber-950/70 border-amber-500/80 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                  : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title={isLooping ? 'Continuous Loop is ACTIVE' : 'Enable Continuous Loop'}
            >
              <Repeat className={`w-4 h-4 ${isLooping ? 'stroke-[2.5]' : ''}`} />
            </Button>

            {/* Metronome Click Track Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleMetronome}
              className={`h-9 w-9 p-0 transition-all ${
                isMetronomeActive
                  ? 'bg-cyan-950/70 border-cyan-500/80 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                  : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title={isMetronomeActive ? 'Metronome rhythm is ACTIVE' : 'Enable Metronome Rhythm'}
            >
              <Timer className={`w-4 h-4 ${isMetronomeActive ? 'stroke-[2.5]' : ''}`} />
            </Button>

            {/* Undo Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={undo}
              disabled={!canUndo}
              className={`h-9 w-9 p-0 bg-slate-800/60 border-slate-700/80 ${
                canUndo ? 'text-slate-200 hover:bg-slate-700 hover:text-white' : 'text-slate-600 cursor-not-allowed'
              }`}
              title="Undo arrangement action (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </Button>

            {/* Redo Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={redo}
              disabled={!canRedo}
              className={`h-9 w-9 p-0 bg-slate-800/60 border-slate-700/80 ${
                canRedo ? 'text-slate-200 hover:bg-slate-700 hover:text-white' : 'text-slate-600 cursor-not-allowed'
              }`}
              title="Redo undone action (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </Button>

            {/* Time Counter Display */}
            <TimeDisplay />

            {/* Master Real-time VU Visualizer */}
            <MasterVisualizer />
          </div>

          {/* Right Controls: Filter, Duration, Projects & Export */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 ml-auto">
            {/* Master DJ Filter Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilterControl(!showFilterControl)}
              className={`h-8 sm:h-9 px-2.5 text-xs flex items-center gap-1.5 ${
                masterFilterFreq < 19000
                  ? 'bg-cyan-950/70 border-cyan-500/80 text-cyan-300 font-semibold shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                  : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="DJ Low-Pass Filter DSP Effect"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline font-mono">DSP Filter</span>
              {masterFilterFreq < 19000 && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping ml-0.5" />
              )}
            </Button>

            {/* Master Length */}
            <select
              value={durationMs}
              onChange={(e) => setDurationMs(Number(e.target.value))}
              className="h-8 sm:h-9 px-2 text-xs font-mono font-semibold border border-slate-700 rounded-lg bg-[#090b10] text-slate-200 hover:border-slate-600 outline-none cursor-pointer"
              title="Master Timeline Duration"
            >
              <option value={15000}>15s Loop</option>
              <option value={30000}>30s Section</option>
              <option value={45000}>45s Track</option>
              <option value={60000}>60s Arrangement</option>
              <option value={90000}>90s Extended</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={onOpenProjects}
              className="text-xs h-8 sm:h-9 px-2 sm:px-3 bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700"
              title="Open saved sessions"
            >
              <FolderOpen className="w-3.5 h-3.5 sm:mr-1 text-slate-400" />
              <span className="hidden sm:inline">Sessions</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveProject}
              isLoading={isSaving}
              className="text-xs h-8 sm:h-9 px-2 sm:px-3 bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700"
              title="Save session to database"
            >
              <Save className="w-3.5 h-3.5 sm:mr-1 text-slate-400" />
              <span className="hidden sm:inline">Save</span>
            </Button>

            {/* Export Format Selector */}
            <div className="flex items-center rounded-lg border border-slate-700 overflow-hidden bg-[#090b10] shadow-md">
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as AudioExportFormat)}
                className="h-8 sm:h-9 px-2 text-[11px] sm:text-xs font-mono font-semibold bg-transparent border-r border-slate-700 text-slate-300 outline-none cursor-pointer"
                title="Select Export Audio Format & Bitrate"
              >
                <option value="mp3-192" className="bg-[#12151e] text-slate-200">MP3 192k</option>
                <option value="mp3-320" className="bg-[#12151e] text-slate-200">MP3 320k Pro</option>
                <option value="wav" className="bg-[#12151e] text-slate-200">WAV Lossless</option>
              </select>

              <Button
                size="sm"
                onClick={handleExport}
                isLoading={isExporting}
                className="text-xs h-8 sm:h-9 px-3 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold flex items-center rounded-none shadow-none"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                {isExporting ? `${exportProgress}%` : 'Export'}
              </Button>
            </div>
          </div>
        </div>

        {/* Master DJ Filter Inline Drawer */}
        {showFilterControl && (
          <div className="p-3 bg-[#0a0c13] border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-100 font-mono">Biquad Low-Pass Filter</span>
                <p className="text-[10px] text-slate-400">Hardware DSP frequency cutoff sweep for transitions & drops</p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-1 max-w-sm">
              <input
                type="range"
                min={200}
                max={20000}
                step={100}
                value={masterFilterFreq}
                onChange={(e) => setMasterFilterFreq(Number(e.target.value))}
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <span className="font-mono text-xs font-bold text-cyan-400 w-16 text-right">
                {masterFilterFreq >= 1000
                  ? `${(masterFilterFreq / 1000).toFixed(1)} kHz`
                  : `${Math.round(masterFilterFreq)} Hz`}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setMasterFilterFreq(800)}
                className="px-2 py-1 text-[10px] bg-slate-800/80 border border-slate-700 text-slate-300 rounded-md font-mono hover:bg-slate-700 hover:text-white"
              >
                Sub 800Hz
              </button>
              <button
                type="button"
                onClick={() => setMasterFilterFreq(3000)}
                className="px-2 py-1 text-[10px] bg-slate-800/80 border border-slate-700 text-slate-300 rounded-md font-mono hover:bg-slate-700 hover:text-white"
              >
                Warm 3kHz
              </button>
              <button
                type="button"
                onClick={() => setMasterFilterFreq(20000)}
                className="px-2 py-1 text-[10px] bg-slate-800/80 border border-slate-700 text-cyan-400 rounded-md font-mono hover:bg-slate-700 flex items-center gap-1"
                title="Bypass filter to full 20 kHz spectrum"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                Bypass (20kHz)
              </button>
            </div>
          </div>
        )}

        {/* Global Loading / Processing Alert */}
        {isProcessingAudio && (
          <div className="p-2.5 rounded-lg bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 text-xs font-semibold flex items-center gap-2 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            <span>{processingStatus || 'Decoding high-precision audio buffer...'}</span>
          </div>
        )}

        {/* Notification Toast */}
        {notification && (
          <div className="p-2 bg-emerald-950/80 border border-emerald-700/60 rounded-lg text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{notification}</span>
          </div>
        )}
      </div>

      {/* Keyboard & Touch Shortcuts Modal */}
      <Modal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
        title="Studio Control Shortcuts"
        description="Speed up multitrack arrangement and editing workflows"
      >
        <div className="space-y-2 pt-2 text-xs text-slate-300 font-sans">
          <div className="grid grid-cols-2 gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 font-mono font-bold text-cyan-400 bg-[#090b10] border border-slate-800 px-2 py-1 rounded">
              <Keyboard className="w-3.5 h-3.5 text-slate-400" />
              <span>Space</span>
            </div>
            <div className="flex items-center text-slate-400">Play / Pause Timeline</div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 font-mono font-bold text-cyan-400 bg-[#090b10] border border-slate-800 px-2 py-1 rounded">
              <Keyboard className="w-3.5 h-3.5 text-slate-400" />
              <span>Ctrl + Z</span>
            </div>
            <div className="flex items-center text-slate-400">Undo arrangement action</div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 font-mono font-bold text-cyan-400 bg-[#090b10] border border-slate-800 px-2 py-1 rounded">
              <Keyboard className="w-3.5 h-3.5 text-slate-400" />
              <span>Ctrl + Y</span>
            </div>
            <div className="flex items-center text-slate-400">Redo undone action</div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 font-mono font-bold text-amber-400 bg-[#090b10] border border-slate-800 px-2 py-1 rounded">
              <Repeat className="w-3.5 h-3.5 text-amber-400" />
              <span>Loop Key</span>
            </div>
            <div className="flex items-center text-slate-400">Toggle continuous loop cycle</div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 font-mono font-bold text-cyan-400 bg-[#090b10] border border-slate-800 px-2 py-1 rounded">
              <Timer className="w-3.5 h-3.5 text-cyan-400" />
              <span>Click Track</span>
            </div>
            <div className="flex items-center text-slate-400">Toggle metronome beat audio</div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 font-mono font-bold text-slate-200 bg-[#090b10] border border-slate-800 px-2 py-1 rounded">
              <span>◀ / ▶</span>
            </div>
            <div className="flex items-center text-slate-400">Nudge clip by 1 beat on mobile</div>
          </div>

          <div className="grid grid-cols-2 gap-2 pb-1">
            <div className="flex items-center gap-1.5 font-mono font-bold text-slate-200 bg-[#090b10] border border-slate-800 px-2 py-1 rounded">
              <span>Duplicate</span>
            </div>
            <div className="flex items-center text-slate-400">Instant clip copy & repeat</div>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
