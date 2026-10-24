import React from 'react';
import { Link } from 'react-router-dom';
import { useStudioStore } from '../../stores/studioStore';
import { Sliders, Plus } from 'lucide-react';

export function Navbar() {
  const { projectTitle, setProjectTitle, resetProject } = useStudioStore();

  const handleNewProject = () => {
    if (confirm('Create a new blank project? Any unsaved arrangement will be cleared.')) {
      resetProject();
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#0e1118]/90 backdrop-blur-md">
      <div className="max-w-[1560px] mx-auto flex h-14 items-center justify-between px-3 sm:px-6">
        {/* Left: Branding */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-cyan-500/20">
              <Sliders className="h-4 w-4 stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-white leading-none">
                  MELODY STUDIO
                </span>
                <span className="text-[9px] font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800/50 px-1 py-0.2 rounded">
                  PRO
                </span>
              </div>
              <span className="text-[9px] text-slate-400 font-mono tracking-wider uppercase">
                Multitrack Sequencer
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Current Project Title & DSP Engine Status */}
        <div className="hidden md:flex items-center gap-3 px-3 py-1 rounded-lg bg-[#141824] border border-slate-800 text-xs">
          <input
            type="text"
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            className="font-medium text-slate-200 bg-transparent border-b border-transparent hover:border-slate-700 focus:border-cyan-500 focus:outline-none px-1 text-xs truncate max-w-xs"
            title="Click to rename project"
          />
          <span className="text-slate-700">•</span>
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>44.1 kHz DSP ACTIVE</span>
          </div>
        </div>

        {/* Right: Quick Tools */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleNewProject}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700/80 bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Create blank project"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Project</span>
          </button>
        </div>
      </div>
    </header>
  );
}
