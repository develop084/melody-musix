import React, { useState } from 'react';
import { TransportBar } from '../components/studio/TransportBar';
import { WaveformTrimmer } from '../components/studio/WaveformTrimmer';
import { TimelineEditor } from '../components/studio/TimelineEditor';
import { MediaSearchModal } from '../components/studio/MediaSearchModal';
import { ProjectsModal } from '../components/studio/ProjectsModal';
import { Music2, Sparkles, Layers, SlidersHorizontal } from 'lucide-react';

export function StudioPage() {
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Studio Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Music2 className="w-6 h-6 text-indigo-600" />
            Melody & Medley Studio
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Sample YouTube tracks, extract hooks, layer melodies across tracks, and export a mastered MP3.
          </p>
        </div>
      </div>

      {/* Master Transport & Controls */}
      <TransportBar
        onOpenSourceModal={() => setIsSourceModalOpen(true)}
        onOpenProjects={() => setIsProjectsModalOpen(true)}
      />

      {/* Visual Waveform Snippet Trimmer */}
      <WaveformTrimmer onOpenSourceModal={() => setIsSourceModalOpen(true)} />

      {/* Multitrack Arrangement Timeline */}
      <TimelineEditor />

      {/* Modals */}
      <MediaSearchModal
        isOpen={isSourceModalOpen}
        onClose={() => setIsSourceModalOpen(false)}
      />

      <ProjectsModal
        isOpen={isProjectsModalOpen}
        onClose={() => setIsProjectsModalOpen(false)}
      />
    </div>
  );
}
