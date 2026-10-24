import React, { useState } from 'react';
import { TransportBar } from '../components/studio/TransportBar';
import { WaveformTrimmer } from '../components/studio/WaveformTrimmer';
import { TimelineEditor } from '../components/studio/TimelineEditor';
import { MediaSearchModal } from '../components/studio/MediaSearchModal';
import { ProjectsModal } from '../components/studio/ProjectsModal';

export function StudioPage() {
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [sourceModalQuery, setSourceModalQuery] = useState('');
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);

  const handleOpenSourceModal = (query = '') => {
    setSourceModalQuery(query);
    setIsSourceModalOpen(true);
  };

  return (
    <div className="space-y-2 sm:space-y-3">
      {/* Master Hardware Transport Console */}
      <TransportBar
        onOpenSourceModal={() => handleOpenSourceModal('')}
        onOpenProjects={() => setIsProjectsModalOpen(true)}
      />

      {/* Sound Vault & Audio Waveform Editor */}
      <WaveformTrimmer onOpenSourceModal={handleOpenSourceModal} />

      {/* Multitrack Arrangement Matrix */}
      <TimelineEditor />

      {/* Modals */}
      <MediaSearchModal
        isOpen={isSourceModalOpen}
        onClose={() => setIsSourceModalOpen(false)}
        initialQuery={sourceModalQuery}
      />

      <ProjectsModal
        isOpen={isProjectsModalOpen}
        onClose={() => setIsProjectsModalOpen(false)}
      />
    </div>
  );
}
