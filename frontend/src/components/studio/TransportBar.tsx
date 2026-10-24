import React, { useState } from 'react';
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
    <Card className="border-slate-200 shadow-sm p-4 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: Project Title & Sourcing Button */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            className="text-base font-bold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1 py-0.5 rounded transition-colors"
            placeholder="Project Title"
          />
          <Button size="sm" onClick={onOpenSourceModal} className="text-xs bg-indigo-600 hover:bg-indigo-700">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Add Audio / YouTube
          </Button>
        </div>

        {/* Center: Playback Controls & Time Counter */}
        <div className="flex items-center gap-3">
          <Button
            size="md"
            onClick={handleTogglePlay}
            className={`h-10 w-12 p-0 shadow-md ${
              isPlaying ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </Button>

          <Button variant="outline" size="sm" onClick={handleStop} className="h-9 w-9 p-0 text-slate-600">
            <Square className="w-4 h-4 fill-current" />
          </Button>

          {/* Time Counter Display */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white font-mono text-sm tracking-widest shadow-inner">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-emerald-400 font-bold">{formatTime(currentTimeMs)}</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400">{formatTime(durationMs)}</span>
          </div>

          {/* Timeline Length Duration Selector */}
          <select
            value={durationMs}
            onChange={(e) => setDurationMs(Number(e.target.value))}
            className="h-9 px-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
            title="Master Timeline Length"
          >
            <option value={15000}>15 Seconds</option>
            <option value={30000}>30 Seconds</option>
            <option value={45000}>45 Seconds</option>
            <option value={60000}>1 Minute</option>
            <option value={90000}>1.5 Minutes</option>
          </select>
        </div>

        {/* Right: Actions (Save Project & Export MP3) */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onOpenProjects} className="text-xs">
            <FolderOpen className="w-3.5 h-3.5 mr-1" />
            My Projects
          </Button>

          <Button variant="outline" size="sm" onClick={handleSaveProject} isLoading={isSaving} className="text-xs">
            <Save className="w-3.5 h-3.5 mr-1" />
            Save
          </Button>

          <Button
            size="sm"
            onClick={handleExportMp3}
            isLoading={isExporting}
            className="text-xs bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            {isExporting ? `Rendering ${exportProgress}%` : 'Export MP3'}
          </Button>
        </div>
      </div>

      {notification && (
        <div className="mt-3 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{notification}</span>
        </div>
      )}
    </Card>
  );
}
