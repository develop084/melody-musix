import React, { useState, useEffect } from 'react';
import { TransportBar } from '../components/studio/TransportBar';
import { WaveformTrimmer } from '../components/studio/WaveformTrimmer';
import { TimelineEditor } from '../components/studio/TimelineEditor';
import { MediaSearchModal } from '../components/studio/MediaSearchModal';
import { ProjectsModal } from '../components/studio/ProjectsModal';
import { WhatsAppShareModal } from '../components/studio/WhatsAppShareModal';
import { useStudioStore } from '../stores/studioStore';
import { audioEngine } from '../audio/audioEngine';

export function StudioPage() {
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [sourceModalQuery, setSourceModalQuery] = useState('');
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  // Warm up Web Audio context on user interaction
  useEffect(() => {
    const handleFirstGesture = () => {
      audioEngine.warmUp();
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
    window.addEventListener('pointerdown', handleFirstGesture, { passive: true });
    window.addEventListener('keydown', handleFirstGesture, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, []);

  // Granular selectors so StudioPage never re-renders on playhead progress
  const projectTitle = useStudioStore((s) => s.projectTitle);
  const durationMs = useStudioStore((s) => s.durationMs);
  const bpm = useStudioStore((s) => s.bpm);

  const handleOpenSourceModal = (query = '') => {
    setSourceModalQuery(query);
    setIsSourceModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* 1. Transport Bar */}
      <TransportBar
        onOpenSourceModal={() => handleOpenSourceModal('')}
        onOpenProjects={() => setIsProjectsModalOpen(true)}
      />

      {/* 2. Waveform Trimmer */}
      <WaveformTrimmer onOpenSourceModal={handleOpenSourceModal} />

      {/* 3. Timeline Editor */}
      <TimelineEditor />

      {/* Core Modals */}
      <MediaSearchModal
        isOpen={isSourceModalOpen}
        onClose={() => setIsSourceModalOpen(false)}
        initialQuery={sourceModalQuery}
      />

      <ProjectsModal
        isOpen={isProjectsModalOpen}
        onClose={() => setIsProjectsModalOpen(false)}
      />

      <WhatsAppShareModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        projectTitle={projectTitle}
        durationMs={durationMs}
        bpm={bpm}
      />
    </div>
  );
}
