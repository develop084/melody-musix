import React, { useEffect, useState } from 'react';
import { projectsApi } from '../../api/projects';
import { Project } from '../../types';
import { useStudioStore } from '../../stores/studioStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Trash2, Plus, ArrowRight, Music, Clock, FolderOpen } from 'lucide-react';

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectsModal({ isOpen, onClose }: ProjectsModalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProject = useStudioStore((s) => s.loadProject);
  const resetProject = useStudioStore((s) => s.resetProject);

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
    if (!confirm('Are you sure you want to delete this session?')) return;

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
      title="Saved Sessions"
      description="Recall, duplicate, or delete saved multitrack audio projects"
      maxWidth="xl"
      featuredIcon={<FolderOpen className="w-5 h-5 text-slate-700" />}
    >
      <div className="space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <Badge variant="default" size="sm">
            {projects.length} saved sessions
          </Badge>
          <Button
            size="xs"
            variant="outline"
            onClick={handleNewProject}
            leftIcon={<Plus className="w-3.5 h-3.5 text-slate-600" />}
          >
            New Session
          </Button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg bg-white shadow-xs">
          {projects.length === 0 && !isLoading && (
            <div className="text-center py-10 text-slate-500 text-xs space-y-1">
              <p className="font-medium text-slate-700">No saved sessions yet</p>
              <p className="text-slate-400 text-xs">
                Arrange sounds on the timeline and click "Save" on the top console.
              </p>
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
                  <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                    <Music className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                      {proj.title}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>{proj.tracks.length} tracks</span>
                      <span>•</span>
                      <span>{totalClips} clips</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono text-slate-600">
                        <Clock className="w-3 h-3" /> {(proj.durationMs / 1000).toFixed(0)}s
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleDelete(proj.id, e)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Delete Session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <Button
                    size="xs"
                    variant="ghost"
                    className="text-slate-700 hover:text-slate-900 font-medium"
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Load
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
