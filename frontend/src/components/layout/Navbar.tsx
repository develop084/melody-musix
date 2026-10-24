import React from 'react';
import { Link } from 'react-router-dom';
import { useStudioStore } from '../../stores/studioStore';
import { Music2, Plus, BookOpen, Activity } from 'lucide-react';
import { Button } from '../ui/Button';

export function Navbar() {
  const { projectTitle, resetProject } = useStudioStore();

  const handleNewProject = () => {
    if (confirm('Create a new blank project? Any unsaved clips in this session will be cleared.')) {
      resetProject();
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur shadow-sm">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Branding */}
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2.5 font-bold text-slate-900 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <Music2 className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base tracking-tight font-extrabold text-slate-900 leading-none">
                Melody Studio
              </span>
              <span className="text-[10px] text-indigo-600 font-semibold tracking-wider uppercase mt-0.5">
                YouTube Mashup & Audio Editor
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Current Project Status Pill */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-600">
          <span className="font-semibold text-slate-900 truncate max-w-xs">{projectTitle}</span>
          <span className="text-slate-300">•</span>
          <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            44.1 kHz Active
          </span>
        </div>

        {/* Right: Quick Tools */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewProject}
            className="text-xs text-slate-700 hover:text-slate-900"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            New
          </Button>

          <a
            href="http://localhost:4000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            title="Inspect OpenAPI 3.1 Swagger UI"
          >
            <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
            <span className="hidden sm:inline">OpenAPI Spec</span>
          </a>
        </div>
      </div>
    </header>
  );
}
