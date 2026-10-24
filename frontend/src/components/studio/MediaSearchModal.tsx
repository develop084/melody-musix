import React, { useState, useEffect, useRef } from 'react';
import { mediaApi } from '../../api/media';
import { MediaTrack } from '../../types';
import { audioEngine } from '../../audio/audioEngine';
import { useStudioStore } from '../../stores/studioStore';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import {
  Search,
  Music,
  Upload,
  Play,
  Square,
  Sparkles,
  Loader2,
  PlusCircle,
  Zap,
} from 'lucide-react';

interface MediaSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export function MediaSearchModal({ isOpen, onClose, initialQuery }: MediaSearchModalProps) {
  const [tab, setTab] = useState<'youtube' | 'samples' | 'upload'>('youtube');
  const [searchQuery, setSearchQuery] = useState(initialQuery || '');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<MediaTrack[]>([]);
  const [samples, setSamples] = useState<MediaTrack[]>([]);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const setSourceTrack = useStudioStore((state) => state.setSourceTrack);
  const setIsProcessingAudio = useStudioStore((state) => state.setIsProcessingAudio);

  // Auto-search if initialQuery provided
  useEffect(() => {
    if (isOpen && initialQuery) {
      setSearchQuery(initialQuery);
      setTab('youtube');
      setIsSearching(true);
      setError(null);
      mediaApi
        .search(initialQuery)
        .then(setResults)
        .catch((err) => setError(err.response?.data?.message || 'Failed to search YouTube media'))
        .finally(() => setIsSearching(false));
    }
  }, [isOpen, initialQuery]);

  // Stop preview audio helper
  const stopAudioPreview = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.src = '';
      previewAudioRef.current = null;
    }
    setPreviewingId(null);
  };

  // Load sample tracks on initial mount
  useEffect(() => {
    if (isOpen && samples.length === 0) {
      mediaApi
        .getSamples()
        .then(setSamples)
        .catch((err) => console.warn('Failed to load samples:', err));
    }
  }, [isOpen, samples.length]);

  // Clean up preview audio on unmount or modal close
  useEffect(() => {
    return () => {
      stopAudioPreview();
    };
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);
    try {
      const data = await mediaApi.search(searchQuery);
      setResults(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to search YouTube media');
    } finally {
      setIsSearching(false);
    }
  };

  // Instant HTML5 streaming preview without full buffer decode delays
  const handlePreview = (track: MediaTrack) => {
    if (previewingId === track.id) {
      stopAudioPreview();
      return;
    }

    stopAudioPreview();
    setPreviewingId(track.id);

    try {
      const audio = new Audio(track.url);
      previewAudioRef.current = audio;

      audio.play().catch((playErr) => {
        console.warn('Audio preview playback error:', playErr);
        stopAudioPreview();
      });

      audio.onended = () => {
        stopAudioPreview();
      };
    } catch (err) {
      stopAudioPreview();
      setError(`Failed to preview audio for "${track.title}"`);
    }
  };

  const handleSelectTrack = async (track: MediaTrack) => {
    stopAudioPreview();
    setLoadingAudioId(track.id);
    setIsProcessingAudio(true, `Importing "${track.title}" into studio...`);

    try {
      const buffer = await audioEngine.decodeAudioFromUrl(track.url);
      setSourceTrack(track, buffer);
      setLoadingAudioId(null);
      setIsProcessingAudio(false);
      onClose();
    } catch (err: any) {
      setLoadingAudioId(null);
      setIsProcessingAudio(false);
      setError(`Failed to decode audio: ${err.message || 'Stream error'}`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    stopAudioPreview();
    setError(null);
    setIsProcessingAudio(true, `Decoding local file "${file.name}"...`);

    try {
      const { buffer, url } = await audioEngine.decodeAudioFromFile(file);
      const customTrack: MediaTrack = {
        id: `local_${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        url,
        duration: `${Math.floor(buffer.duration / 60)}:${Math.floor(buffer.duration % 60)
          .toString()
          .padStart(2, '0')}`,
        author: 'Local File',
      };
      setSourceTrack(customTrack, buffer);
      setIsProcessingAudio(false);
      onClose();
    } catch (err) {
      setIsProcessingAudio(false);
      setError('Failed to decode local audio file. Ensure it is a valid MP3, WAV, or AAC file.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        stopAudioPreview();
        onClose();
      }}
      title="Audio Import & YouTube Sampler"
      description="Sample directly from YouTube, audition factory stem library, or import local master audio"
      className="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Navigation Tabs (Mobile Responsive & Scrollable) */}
        <div className="flex border-b border-slate-800 gap-1 pb-1 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setTab('youtube')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-semibold rounded-lg transition-colors flex-shrink-0 ${
              tab === 'youtube'
                ? 'bg-cyan-950/70 border border-cyan-800/60 text-cyan-300'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            YouTube Search
          </button>
          <button
            type="button"
            onClick={() => setTab('samples')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-semibold rounded-lg transition-colors flex-shrink-0 ${
              tab === 'samples'
                ? 'bg-cyan-950/70 border border-cyan-800/60 text-cyan-300'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Music className="w-3.5 h-3.5 text-cyan-400" />
            Factory Stem Library
            <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-300 px-1.5 py-0.2 rounded font-mono">
              Lossless
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab('upload')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-semibold rounded-lg transition-colors flex-shrink-0 ${
              tab === 'upload'
                ? 'bg-cyan-950/70 border border-cyan-800/60 text-cyan-300'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Local Audio Import
          </button>
        </div>

        {error && <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800/60 text-red-300 text-xs font-medium">{error}</div>}

        {/* Tab 1: YouTube Search */}
        {tab === 'youtube' && (
          <div className="space-y-3">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder="Search song title, artist, or paste YouTube link..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 font-mono text-xs"
                autoFocus
              />
              <Button type="submit" size="md" isLoading={isSearching} className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold">
                <Search className="w-4 h-4 mr-1.5" />
                Search
              </Button>
            </form>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-800 border border-slate-800 rounded-xl bg-[#090b10]">
              {results.length === 0 && !isSearching && (
                <div className="text-center py-10 text-slate-500 font-mono text-xs">
                  Type a song or artist above to query the YouTube audio catalog.
                </div>
              )}

              {results.map((track) => (
                <div
                  key={track.id}
                  className="p-3 flex items-center justify-between hover:bg-slate-850/40 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {track.thumbnail ? (
                      <img
                        src={track.thumbnail}
                        alt=""
                        className="w-14 h-10 object-cover rounded-md flex-shrink-0 bg-slate-900 border border-slate-800"
                      />
                    ) : (
                      <div className="w-14 h-10 rounded-md bg-slate-800 flex items-center justify-center text-cyan-400 flex-shrink-0">
                        <Music className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-mono font-bold text-slate-200 truncate">{track.title}</p>
                      <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                        {track.author} • {track.duration}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview(track)}
                      disabled={loadingAudioId === track.id}
                      className="h-8 px-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700"
                      title="Audition"
                    >
                      {loadingAudioId === track.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                      ) : previewingId === track.id ? (
                        <Square className="w-3.5 h-3.5 text-amber-400 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current text-cyan-400" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSelectTrack(track)}
                      className="h-8 text-xs bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold"
                    >
                      <PlusCircle className="w-3.5 h-3.5 mr-1" />
                      Import
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Samples & Loops */}
        {tab === 'samples' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400 font-mono">
              Factory studio-synthesized stems engineered for seamless harmonic layering:
            </p>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-800 border border-slate-800 rounded-xl bg-[#090b10]">
              {samples.map((track) => (
                <div
                  key={track.id}
                  className="p-3 flex items-center justify-between hover:bg-slate-850/40 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={track.thumbnail}
                      alt=""
                      className="w-14 h-10 object-cover rounded-md flex-shrink-0 bg-slate-900 border border-slate-800"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-mono font-bold text-slate-200 truncate">{track.title}</p>
                      <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                        {track.author} • {track.duration}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview(track)}
                      disabled={loadingAudioId === track.id}
                      className="h-8 px-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700"
                    >
                      {loadingAudioId === track.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                      ) : previewingId === track.id ? (
                        <Square className="w-3.5 h-3.5 text-amber-400 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current text-cyan-400" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSelectTrack(track)}
                      className="h-8 text-xs bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold"
                    >
                      <PlusCircle className="w-3.5 h-3.5 mr-1" />
                      Import
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Local File Upload */}
        {tab === 'upload' && (
          <div className="p-8 border-2 border-dashed border-slate-800 rounded-2xl text-center space-y-4 hover:border-cyan-500/60 transition-colors bg-[#090b10]">
            <div className="h-12 w-12 rounded-2xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400 mx-auto flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200 font-mono">Import Master Audio From Disk</p>
              <p className="text-xs text-slate-400 mt-1 font-mono">Supports MP3, WAV Lossless, AAC, and FLAC containers</p>
            </div>
            <label className="inline-flex cursor-pointer">
              <span className="px-4 py-2 text-xs font-bold text-slate-950 bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-md transition-colors">
                Select Audio File
              </span>
              <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        )}
      </div>
    </Modal>
  );
}
