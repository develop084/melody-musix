import React, { useEffect, useState } from 'react';
import { projectsApi } from '../../api/projects';
import { Project } from '../../types';
import { useStudioStore } from '../../stores/studioStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Folder, Trash2, Plus, ArrowRight, Music, Clock } from 'lucide-react';

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectsModal({ isOpen, onClose }: ProjectsModalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { loadProject, resetProject } = useStudioStore();

  const fetchProjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await projectsApi.list();
      setProjects(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch saved projects');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen]);

  const handleLoad = (project: Project) => {
    loadProject(project);
    onClose();
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this medley project?')) return;

    try {
      await projectsApi.delete(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      alert(`Delete failed: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleNewProject = () => {
    if (confirm('Create a new blank project? Any unsaved changes in current session will be cleared.')) {
      resetProject();
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Saved Medley Projects"
      description="Load or manage your saved audio arrangement projects"
      className="max-w-xl"
    >
      <div className="space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <span className="text-xs font-semibold text-slate-500">
            {projects.length} saved projects in database
          </span>
          <Button size="sm" variant="outline" onClick={handleNewProject} className="text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" />
            New Blank Project
          </Button>
        </div>

        {error && <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs font-medium">{error}</div>}

        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl">
          {projects.length === 0 && !isLoading && (
            <div className="text-center py-10 text-slate-400 text-xs">
              No saved projects yet. Build a melody on the timeline and click "Save"!
            </div>
          )}

          {projects.map((proj) => {
            const totalClips = proj.tracks.reduce((acc, t) => acc + t.clips.length, 0);

            return (
              <div
                key={proj.id}
                onClick={() => handleLoad(proj)}
                className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Music className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                      {proj.title}
                    </p>
                    <p className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{proj.tracks.length} tracks</span>
                      <span>•</span>
                      <span>{totalClips} clips</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-3 h-3" /> {(proj.durationMs / 1000).toFixed(0)}s
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleDelete(proj.id, e)}
                    className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <Button size="sm" variant="ghost" className="h-8 text-xs text-blue-600">
                    Load <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
