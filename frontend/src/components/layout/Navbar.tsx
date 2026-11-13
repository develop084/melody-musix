import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStudioStore } from '../../stores/studioStore';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { WhatsAppShareModal } from '../studio/WhatsAppShareModal';
import { Sliders, Plus, MessageCircle, Edit3 } from 'lucide-react';

export function Navbar() {
  const projectTitle = useStudioStore((s) => s.projectTitle);
  const setProjectTitle = useStudioStore((s) => s.setProjectTitle);
  const resetProject = useStudioStore((s) => s.resetProject);
  const durationMs = useStudioStore((s) => s.durationMs);
  const bpm = useStudioStore((s) => s.bpm);

  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);

  const handleNewProject = () => {
    if (confirm('Create a new blank project? Any unsaved arrangement will be cleared.')) {
      resetProject();
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white">
      <div className="max-w-[1560px] mx-auto flex h-14 items-center justify-between px-3 sm:px-6">
        {/* Left: Branding */}
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-xs">
              <Sliders className="h-4 w-4 stroke-[2]" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight text-slate-900 leading-none">
                Melody Studio
              </span>
              <span className="text-[11px] text-slate-500 font-normal">
                Audio Editor
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Session Title */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <Edit3 className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              className="font-medium text-slate-800 bg-transparent border-none focus:outline-none px-1 text-xs truncate max-w-[200px]"
              title="Click to rename session"
              placeholder="Session Title"
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsWhatsAppOpen(true)}
            leftIcon={<MessageCircle className="w-3.5 h-3.5 text-emerald-600" />}
            title="Share session"
          >
            <span>Share</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleNewProject}
            leftIcon={<Plus className="w-3.5 h-3.5 text-slate-600" />}
            title="Create blank project"
          >
            <span>New Session</span>
          </Button>
        </div>
      </div>

      <WhatsAppShareModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        projectTitle={projectTitle}
        durationMs={durationMs}
        bpm={bpm}
      />
    </header>
  );
}
