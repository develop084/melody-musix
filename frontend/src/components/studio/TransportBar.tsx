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

export function TransportBar({ onOpenProjects, onOpenSourceModal }: TransportBarProps) {
  const {
    projectTitle,
    tracks,
    bpm,
    durationMs,
    currentTimeMs,
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

  // Time formatting helper
  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const mins = Math.floor(totalSec / 60)
      .toString()
      .padStart(2, '0');
    const secs = (totalSec % 60).toString().padStart(2, '0');
    const millis = Math.floor((ms % 1000) / 100);
    return `${mins}:${secs}.${millis}`;
  };

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
      setNotification('✨ Chill Medley Demo loaded! Press Play to listen.');
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      alert('Failed to load demo project');
    } finally {
      setIsLoadingDemo(false);
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm p-3 sm:p-4 bg-white">
      <div className="flex flex-col gap-3">
        {/* Row 1: Title input, Demo Melody & Audio Source Action */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <input
            type="text"
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            className="text-sm sm:text-base font-bold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1 py-0.5 rounded transition-colors max-w-xs"
            placeholder="Project Title"
          />
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsShortcutsOpen(true)}
              className="text-xs border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center font-medium h-8 px-2"
              title="Keyboard & Touch Shortcuts"
            >
              <HelpCircle className="w-3.5 h-3.5 sm:mr-1 text-slate-500" />
              <span className="hidden sm:inline">Shortcuts</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadDemo}
              isLoading={isLoadingDemo}
              className="text-xs border-purple-200 text-purple-700 hover:bg-purple-50 shadow-sm flex items-center font-medium"
              title="Arrange an instant 3-track chill demo melody"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
              1-Click Demo
            </Button>
            <Button
              size="sm"
              onClick={onOpenSourceModal}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 shadow-sm flex items-center justify-center font-semibold"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Add Audio / YouTube
            </Button>
          </div>
        </div>

        {/* Row 2: Playback Transport, Undo/Redo & Actions (Fully Responsive) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
          {/* Playback & Undo/Redo & Visualizer cluster */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <Button
              size="md"
              onClick={handleTogglePlay}
              className={`h-9 w-11 sm:h-10 sm:w-12 p-0 shadow-md ${
                isPlaying ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
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
              className="h-9 w-9 p-0 text-slate-600"
              title="Stop & Return to Start"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </Button>

            {/* Loop Toggle Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleLoop}
              className={`h-9 w-9 p-0 transition-colors ${
                isLooping
                  ? 'bg-amber-50 border-amber-300 text-amber-600 hover:bg-amber-100'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              title={isLooping ? 'Looping is ON (click to disable)' : 'Enable Continuous Looping'}
            >
              <Repeat className={`w-4 h-4 ${isLooping ? 'text-amber-600 stroke-[2.5]' : ''}`} />
            </Button>

            {/* Metronome Click Track Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleMetronome}
              className={`h-9 w-9 p-0 transition-colors ${
                isMetronomeActive
                  ? 'bg-blue-50 border-blue-300 text-blue-600 hover:bg-blue-100'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              title={isMetronomeActive ? 'Metronome click is ON (click to disable)' : 'Enable Metronome (Click track)'}
            >
              <Timer className={`w-4 h-4 ${isMetronomeActive ? 'text-blue-600 stroke-[2.5]' : ''}`} />
            </Button>

            {/* Undo Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={undo}
              disabled={!canUndo}
              className={`h-9 w-9 p-0 ${
                canUndo ? 'text-slate-800 hover:bg-slate-100' : 'text-slate-300 cursor-not-allowed'
              }`}
              title="Undo action (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </Button>

            {/* Redo Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={redo}
              disabled={!canRedo}
              className={`h-9 w-9 p-0 ${
                canRedo ? 'text-slate-800 hover:bg-slate-100' : 'text-slate-300 cursor-not-allowed'
              }`}
              title="Redo action (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </Button>

            {/* Time Counter Display */}
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white font-mono text-xs sm:text-sm tracking-wider shadow-inner">
              <Clock className="w-3 h-3 text-blue-400 hidden sm:inline" />
              <span className="text-emerald-400 font-bold">{formatTime(currentTimeMs)}</span>
              <span className="text-slate-600">/</span>
              <span className="text-slate-400">{formatTime(durationMs)}</span>
            </div>

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
              className={`h-8 sm:h-9 px-2 text-xs flex items-center gap-1 ${
                masterFilterFreq < 19000
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold'
                  : 'text-slate-600'
              }`}
              title="DJ Low-Pass Filter Effect"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">DJ Filter</span>
              {masterFilterFreq < 19000 && (
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping ml-0.5" />
              )}
            </Button>

            {/* Master Length */}
            <select
              value={durationMs}
              onChange={(e) => setDurationMs(Number(e.target.value))}
              className="h-8 sm:h-9 px-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
              title="Master Timeline Length"
            >
              <option value={15000}>15s</option>
              <option value={30000}>30s</option>
              <option value={45000}>45s</option>
              <option value={60000}>60s</option>
              <option value={90000}>90s</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={onOpenProjects}
              className="text-xs h-8 sm:h-9 px-2 sm:px-3"
              title="Load saved projects"
            >
              <FolderOpen className="w-3.5 h-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Projects</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveProject}
              isLoading={isSaving}
              className="text-xs h-8 sm:h-9 px-2 sm:px-3"
              title="Save project"
            >
              <Save className="w-3.5 h-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Save</span>
            </Button>

            {/* Export Format Selector */}
            <div className="flex items-center rounded-lg border border-slate-300 overflow-hidden bg-white shadow-sm">
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as AudioExportFormat)}
                className="h-8 sm:h-9 px-2 text-[11px] sm:text-xs font-semibold bg-transparent border-r border-slate-200 outline-none cursor-pointer"
                title="Select Export Quality & Audio Format"
              >
                <option value="mp3-192">MP3 192k</option>
                <option value="mp3-320">MP3 320k (HD)</option>
                <option value="wav">WAV Lossless</option>
              </select>

              <Button
                size="sm"
                onClick={handleExport}
                isLoading={isExporting}
                className="text-xs h-8 sm:h-9 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center rounded-none"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                {isExporting ? `${exportProgress}%` : 'Export'}
              </Button>
            </div>
          </div>
        </div>

        {/* Master DJ Filter Inline Drawer */}
        {showFilterControl && (
          <div className="p-2.5 sm:p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <div>
                <span className="text-xs font-bold text-indigo-950">Master DJ Low-Pass Filter</span>
                <p className="text-[10px] text-indigo-700">Real-time sweep for club build-ups & drops</p>
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
                className="w-full accent-indigo-600 h-1.5 bg-indigo-200 rounded-lg cursor-pointer"
              />
              <span className="font-mono text-xs font-bold text-indigo-900 w-16 text-right">
                {masterFilterFreq >= 1000
                  ? `${(masterFilterFreq / 1000).toFixed(1)} kHz`
                  : `${Math.round(masterFilterFreq)} Hz`}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setMasterFilterFreq(800)}
                className="px-2 py-0.5 text-[10px] bg-white border border-indigo-200 text-indigo-700 rounded-md font-semibold hover:bg-indigo-100"
              >
                Club Sub (800Hz)
              </button>
              <button
                type="button"
                onClick={() => setMasterFilterFreq(3000)}
                className="px-2 py-0.5 text-[10px] bg-white border border-indigo-200 text-indigo-700 rounded-md font-semibold hover:bg-indigo-100"
              >
                Warm Mid (3kHz)
              </button>
              <button
                type="button"
                onClick={() => setMasterFilterFreq(20000)}
                className="px-2 py-0.5 text-[10px] bg-white border border-indigo-200 text-indigo-700 rounded-md font-semibold hover:bg-indigo-100 flex items-center gap-0.5"
                title="Reset filter to full spectrum"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                Reset (20kHz)
              </button>
            </div>
          </div>
        )}

        {/* Global Loading / Processing Alert */}
        {isProcessingAudio && (
          <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold flex items-center gap-2 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span>{processingStatus || 'Streaming and decoding audio buffer... Please wait'}</span>
          </div>
        )}

        {/* Notification Toast */}
        {notification && (
          <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{notification}</span>
          </div>
        )}
      </div>

      {/* Keyboard & Touch Shortcuts Modal */}
      <Modal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
        title="Pro Keyboard & Touch Shortcuts"
        description="Speed up your audio editing and melody arrangement"
      >
        <div className="space-y-2.5 pt-2 text-xs text-slate-700">
          <div className="grid grid-cols-2 gap-2 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded">
              <Keyboard className="w-3.5 h-3.5 text-blue-600" />
              <span>Space</span>
            </div>
            <div className="flex items-center text-slate-600">Play / Pause Timeline</div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded">
              <Keyboard className="w-3.5 h-3.5 text-blue-600" />
              <span>Ctrl + Z</span>
            </div>
            <div className="flex items-center text-slate-600">Undo last arrangement change</div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded">
              <Keyboard className="w-3.5 h-3.5 text-blue-600" />
              <span>Ctrl + Y</span>
            </div>
            <div className="flex items-center text-slate-600">Redo undone change</div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded">
              <Repeat className="w-3.5 h-3.5 text-amber-600" />
              <span>Loop Icon</span>
            </div>
            <div className="flex items-center text-slate-600">Toggle seamless continuous cycle</div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded">
              <Timer className="w-3.5 h-3.5 text-blue-600" />
              <span>Timer Icon</span>
            </div>
            <div className="flex items-center text-slate-600">Toggle metronome rhythm click</div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded">
              <span>◀ / ▶ Buttons</span>
            </div>
            <div className="flex items-center text-slate-600">Touch-friendly clip nudge on phones</div>
          </div>

          <div className="grid grid-cols-2 gap-2 pb-1">
            <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded">
              <span>Copy Icon</span>
            </div>
            <div className="flex items-center text-slate-600">Instant clip duplicate & repeat</div>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
