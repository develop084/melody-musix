import React, { useState, useEffect, useRef } from 'react';
import { useStudioStore, registerPlayheadListener } from '../../stores/studioStore';
import { renderAndExportAudio, AudioExportFormat, downloadBlob } from '../../audio/mp3Exporter';
import { projectsApi } from '../../api/projects';
import { MasterVisualizer } from './MasterVisualizer';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { WhatsAppShareModal } from './WhatsAppShareModal';
import {
  Play,
  Pause,
  Square,
  Repeat,
  Download,
  Save,
  FolderOpen,
  Clock,
  CheckCircle2,
  Undo2,
  Redo2,
  SlidersHorizontal,
  RotateCcw,
  Timer,
  HelpCircle,
  Keyboard,
  MessageCircle,
} from 'lucide-react';

interface TransportBarProps {
  onOpenProjects: () => void;
  onOpenSourceModal: () => void;
}

// Ultra-fast TimeDisplay component - updates via direct DOM textContent with 0 React overhead
function TimeDisplay() {
  const durationMs = useStudioStore((s) => s.durationMs);
  const currentTimeMs = useStudioStore((s) => s.currentTimeMs);
  const timeSpanRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const unregister = registerPlayheadListener((timeMs) => {
      if (!timeSpanRef.current) return;
      const totalSec = Math.floor(timeMs / 1000);
      const mins = Math.floor(totalSec / 60)
        .toString()
        .padStart(2, '0');
      const secs = (totalSec % 60).toString().padStart(2, '0');
      const millis = Math.floor((timeMs % 1000) / 100);
      timeSpanRef.current.textContent = `${mins}:${secs}.${millis}`;
    });
    return unregister;
  }, []);

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
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-mono text-xs sm:text-sm tracking-wide">
      <Clock className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
      <span ref={timeSpanRef} className="text-slate-900 font-semibold tracking-wider">
        {mins}:{secs}.{millis}
      </span>
      <span className="text-slate-400">/</span>
      <span className="text-slate-500 font-normal">{durMins}:{durSecs}</span>
    </div>
  );
}

export function TransportBar({ onOpenProjects, onOpenSourceModal }: TransportBarProps) {
  // Granular selectors so TransportBar only re-renders when actual states change, NOT every 16ms
  const projectTitle = useStudioStore((s) => s.projectTitle);
  const tracks = useStudioStore((s) => s.tracks);
  const bpm = useStudioStore((s) => s.bpm);
  const durationMs = useStudioStore((s) => s.durationMs);
  const isPlaying = useStudioStore((s) => s.isPlaying);
  const isLooping = useStudioStore((s) => s.isLooping);
  const toggleLoop = useStudioStore((s) => s.toggleLoop);
  const isMetronomeActive = useStudioStore((s) => s.isMetronomeActive);
  const toggleMetronome = useStudioStore((s) => s.toggleMetronome);
  const canUndo = useStudioStore((s) => s.canUndo);
  const canRedo = useStudioStore((s) => s.canRedo);
  const undo = useStudioStore((s) => s.undo);
  const redo = useStudioStore((s) => s.redo);
  const setProjectTitle = useStudioStore((s) => s.setProjectTitle);
  const setDurationMs = useStudioStore((s) => s.setDurationMs);
  const playMasterTimeline = useStudioStore((s) => s.playMasterTimeline);
  const stopMasterTimeline = useStudioStore((s) => s.stopMasterTimeline);
  const setCurrentTimeMs = useStudioStore((s) => s.setCurrentTimeMs);
  const loadDemoProject = useStudioStore((s) => s.loadDemoProject);

  const [exportFormat, setExportFormat] = useState<AudioExportFormat>('mp3-192');
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // WhatsApp Sharing State
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [exportedAudioBlob, setExportedAudioBlob] = useState<Blob | null>(null);
  const [exportedFileName, setExportedFileName] = useState<string>('');

  // Global Undo / Redo keyboard shortcuts
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
      alert('Timeline is empty! Add sound clips or load the demo template first.');
      return;
    }

    setIsExporting(true);
    setExportProgress(10);

    try {
      const { blob, extension } = await renderAndExportAudio(tracks, durationMs, exportFormat, (pct) => {
        setExportProgress(pct);
      });

      const safeFilename = `${projectTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}.${extension}`;
      downloadBlob(blob, safeFilename);

      setExportedAudioBlob(blob);
      setExportedFileName(safeFilename);

      setNotification(`🎉 Exported & downloaded "${safeFilename}"!`);
      setTimeout(() => setNotification(null), 5000);

      // Prompt with WhatsApp share modal
      setIsWhatsAppModalOpen(true);
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
      setNotification(`Saved session "${projectTitle}"!`);
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      alert(`Failed to save: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadDemo = async () => {
    setIsLoadingDemo(true);
    try {
      await loadDemoProject();
      setNotification('Template loaded into timeline!');
      setTimeout(() => setNotification(null), 4000);
    } catch {
      alert('Failed to load demo template');
    } finally {
      setIsLoadingDemo(false);
    }
  };

  return (
    <Card className="border-slate-200 bg-white shadow-xs p-3.5 sm:p-4 text-slate-900 rounded-xl">
      <div className="flex flex-col gap-3">
        {/* Row 1: Session Controls & Main Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Session:</span>
            <input
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              className="text-xs sm:text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-slate-400 focus:bg-white focus:outline-none px-3 py-1.5 rounded-lg transition-all w-48 sm:w-64"
              placeholder="Session Name"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadDemo}
              isLoading={isLoadingDemo}
              leftIcon={<RotateCcw className="w-3.5 h-3.5 text-slate-600" />}
              title="Load demo 3-track template"
            >
              <span>Demo Track</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onOpenProjects}
              leftIcon={<FolderOpen className="w-3.5 h-3.5 text-slate-600" />}
              title="Open saved sessions"
            >
              <span>Saved Projects</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsShortcutsOpen(true)}
              leftIcon={<HelpCircle className="w-3.5 h-3.5 text-slate-500" />}
            >
              <span>Shortcuts</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={onOpenSourceModal}
              leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
            >
              Import Audio
            </Button>
          </div>
        </div>

        {/* Row 2: Playback Transport & Export Console */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {/* Playback Cluster */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <Button
              size="sm"
              onClick={handleTogglePlay}
              className={`h-9 w-11 sm:h-9 sm:w-12 p-0 rounded-lg text-white transition-colors ${
                isPlaying
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-slate-900 hover:bg-slate-800'
              }`}
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleStop}
              className="h-9 w-9 p-0 rounded-lg text-slate-600 hover:text-slate-900"
              title="Stop (Return to Start)"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </Button>

            {/* Loop Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleLoop}
              className={`h-9 w-9 p-0 rounded-lg ${
                isLooping
                  ? 'bg-slate-100 border-slate-400 text-slate-900 font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title={isLooping ? 'Loop is ACTIVE' : 'Enable Loop'}
            >
              <Repeat className={`w-3.5 h-3.5 ${isLooping ? 'stroke-[2.5]' : ''}`} />
            </Button>

            {/* Metronome */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleMetronome}
              className={`h-9 w-9 p-0 rounded-lg ${
                isMetronomeActive
                  ? 'bg-slate-100 border-slate-400 text-slate-900 font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title={isMetronomeActive ? 'Metronome ACTIVE' : 'Enable Metronome'}
            >
              <Timer className={`w-3.5 h-3.5 ${isMetronomeActive ? 'stroke-[2.5]' : ''}`} />
            </Button>

            {/* Undo */}
            <Button
              variant="outline"
              size="sm"
              onClick={undo}
              disabled={!canUndo}
              className="h-9 w-9 p-0 rounded-lg text-slate-500 hover:text-slate-800"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </Button>

            {/* Redo */}
            <Button
              variant="outline"
              size="sm"
              onClick={redo}
              disabled={!canRedo}
              className="h-9 w-9 p-0 rounded-lg text-slate-500 hover:text-slate-800"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </Button>

            {/* Time Counter */}
            <TimeDisplay />

            {/* Level Visualizer */}
            <MasterVisualizer />
          </div>

          {/* Right Controls: Duration, Saved Sessions, Export & Share */}
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            {/* Timeline Duration Selector */}
            <select
              value={durationMs}
              onChange={(e) => setDurationMs(Number(e.target.value))}
              className="h-9 px-2.5 text-xs font-medium border border-slate-200 rounded-lg bg-white text-slate-800 hover:border-slate-300 outline-none cursor-pointer shadow-xs"
              title="Timeline Duration Limit"
            >
              <option value={15000}>15s (Ringtone)</option>
              <option value={30000}>30s (Status)</option>
              <option value={45000}>45s (Track Cut)</option>
              <option value={60000}>60s (Short)</option>
              <option value={90000}>90s (Extended)</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveProject}
              isLoading={isSaving}
              leftIcon={<Save className="w-3.5 h-3.5 text-slate-500" />}
              title="Save session to database"
            >
              <span>Save</span>
            </Button>

            {/* Export Format Selector & Button */}
            <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden bg-white shadow-xs">
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as AudioExportFormat)}
                className="h-9 px-2.5 text-xs font-medium bg-slate-50 border-r border-slate-200 text-slate-700 outline-none cursor-pointer"
                title="Select Export Audio Format"
              >
                <option value="mp3-192">MP3 (192k)</option>
                <option value="mp3-320">MP3 (320k HD)</option>
                <option value="wav">WAV (Lossless)</option>
              </select>

              <Button
                variant="primary"
                size="sm"
                onClick={handleExport}
                isLoading={isExporting}
                className="rounded-none h-9 px-3.5 shadow-none"
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                {isExporting ? `${exportProgress}%` : 'Export'}
              </Button>
            </div>

            <Button
              variant="whatsapp"
              size="sm"
              onClick={() => setIsWhatsAppModalOpen(true)}
              leftIcon={<MessageCircle className="w-3.5 h-3.5 fill-current" />}
              title="Share on WhatsApp"
            >
              Share
            </Button>
          </div>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notification}</span>
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts Modal */}
      <Modal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
        title="Keyboard & Control Shortcuts"
        description="Speed up your audio editing and arrangement workflow"
        featuredIcon={<Keyboard className="w-5 h-5 text-cyan-600" />}
      >
        <div className="space-y-2 pt-1 text-xs text-slate-700 font-sans">
          <div className="grid grid-cols-2 gap-2 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1.5 font-mono font-bold text-cyan-800 bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg">
              <span>Space</span>
            </div>
            <div className="flex items-center text-slate-600">Play / Pause Timeline</div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1.5 font-mono font-bold text-cyan-800 bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg">
              <span>Ctrl + Z</span>
            </div>
            <div className="flex items-center text-slate-600">Undo action</div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1.5 font-mono font-bold text-cyan-800 bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg">
              <span>Ctrl + Y</span>
            </div>
            <div className="flex items-center text-slate-600">Redo action</div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1.5 font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
              <span>Drag Edges</span>
            </div>
            <div className="flex items-center text-slate-600">Frame & Trim in/out times</div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1.5 font-mono font-bold text-cyan-800 bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg">
              <span>Drag Body</span>
            </div>
            <div className="flex items-center text-slate-600">Move clip across timeline/tracks</div>
          </div>
        </div>
      </Modal>

      {/* WhatsApp Sharing Suite Modal */}
      <WhatsAppShareModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        projectTitle={projectTitle}
        durationMs={durationMs}
        bpm={bpm}
        audioBlob={exportedAudioBlob}
        audioFileName={exportedFileName}
      />
    </Card>
  );
}
