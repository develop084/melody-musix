import React, { useState, useEffect } from 'react';
import { useStudioStore } from '../../stores/studioStore';
import { renderAndExportMp3, downloadBlob } from '../../audio/mp3Exporter';
import { projectsApi } from '../../api/projects';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import {
  Play,
  Pause,
  Square,
  Download,
  Save,
  FolderOpen,
  Clock,
  Sparkles,
  CheckCircle2,
  Loader2,
  Undo2,
  Redo2,
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
  } = useStudioStore();

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
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

  const handleExportMp3 = async () => {
    const totalClips = tracks.reduce((acc, t) => acc + t.clips.length, 0);
    if (totalClips === 0) {
      alert('Your timeline is empty! Add clips to the tracks first before exporting.');
      return;
    }

    setIsExporting(true);
    setExportProgress(5);

    try {
      const mp3Blob = await renderAndExportMp3(tracks, durationMs, 192, (pct) => {
        setExportProgress(pct);
      });

      const safeFilename = `${projectTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}.mp3`;
      downloadBlob(mp3Blob, safeFilename);

      setNotification(`🎉 Successfully exported & downloaded "${safeFilename}"!`);
      setTimeout(() => setNotification(null), 5000);
    } catch (err: any) {
      alert(`MP3 Export failed: ${err.message || 'Unknown error'}`);
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

  return (
    <Card className="border-slate-200 shadow-sm p-3 sm:p-4 bg-white">
      <div className="flex flex-col gap-3">
        {/* Row 1: Title input & Audio Source Action */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <input
            type="text"
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            className="text-sm sm:text-base font-bold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1 py-0.5 rounded transition-colors max-w-xs"
            placeholder="Project Title"
          />
          <Button
            size="sm"
            onClick={onOpenSourceModal}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 shadow-sm flex items-center justify-center font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Add Audio / YouTube
          </Button>
        </div>

        {/* Row 2: Playback Transport, Undo/Redo & Actions (Fully Responsive) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
          {/* Playback & Undo/Redo cluster */}
          <div className="flex items-center gap-1.5 sm:gap-2">
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
          </div>

          {/* Right Controls: Duration & Project Management */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 ml-auto">
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

            <Button
              size="sm"
              onClick={handleExportMp3}
              isLoading={isExporting}
              className="text-xs h-8 sm:h-9 px-3 bg-emerald-600 hover:bg-emerald-700 shadow-sm text-white font-semibold flex items-center"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              {isExporting ? `${exportProgress}%` : 'Export MP3'}
            </Button>
          </div>
        </div>

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
    </Card>
  );
}
