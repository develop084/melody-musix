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
      title="Add Song or Sample to Studio"
      description="Search YouTube, pick instant built-in loops, or upload your own audio file"
      className="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Navigation Tabs (Mobile Responsive & Scrollable) */}
        <div className="flex border-b border-slate-200 gap-1 pb-1 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setTab('youtube')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex-shrink-0 ${
              tab === 'youtube'
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            YouTube Search
          </button>
          <button
            type="button"
            onClick={() => setTab('samples')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex-shrink-0 ${
              tab === 'samples'
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Built-in Loops
            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-bold">Instant</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('upload')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex-shrink-0 ${
              tab === 'upload'
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Local Audio File
          </button>
        </div>

        {error && <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs font-medium">{error}</div>}

        {/* Tab 1: YouTube Search */}
        {tab === 'youtube' && (
          <div className="space-y-3">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder="Search song title, artist, or paste YouTube link..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
                autoFocus
              />
              <Button type="submit" size="md" isLoading={isSearching}>
                <Search className="w-4 h-4 mr-1.5" />
                Search
              </Button>
            </form>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl">
              {results.length === 0 && !isSearching && (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Type a song title above (e.g. "lofi chill", "synthwave melody") to search YouTube.
                </div>
              )}

              {results.map((track) => (
                <div
                  key={track.id}
                  className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {track.thumbnail ? (
                      <img
                        src={track.thumbnail}
                        alt=""
                        className="w-14 h-10 object-cover rounded-md flex-shrink-0 bg-slate-100"
                      />
                    ) : (
                      <div className="w-14 h-10 rounded-md bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                        <Music className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{track.title}</p>
                      <p className="text-[11px] text-slate-500 truncate">
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
                      className="h-8 px-2.5"
                    >
                      {loadingAudioId === track.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : previewingId === track.id ? (
                        <Square className="w-3.5 h-3.5 text-red-600 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current" />
                      )}
                    </Button>
                    <Button size="sm" onClick={() => handleSelectTrack(track)} className="h-8 text-xs">
                      <PlusCircle className="w-3.5 h-3.5 mr-1" />
                      Load
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
            <p className="text-xs text-slate-500">
              Studio-synthesized loops designed to instantly layer chords, bass, and drums into your melody:
            </p>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl">
              {samples.map((track) => (
                <div
                  key={track.id}
                  className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={track.thumbnail}
                      alt=""
                      className="w-14 h-10 object-cover rounded-md flex-shrink-0 bg-slate-100"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{track.title}</p>
                      <p className="text-[11px] text-slate-500 truncate">
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
                      className="h-8 px-2.5"
                    >
                      {loadingAudioId === track.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : previewingId === track.id ? (
                        <Square className="w-3.5 h-3.5 text-red-600 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current" />
                      )}
                    </Button>
                    <Button size="sm" onClick={() => handleSelectTrack(track)} className="h-8 text-xs">
                      <PlusCircle className="w-3.5 h-3.5 mr-1" />
                      Load
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Local File Upload */}
        {tab === 'upload' && (
          <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-4 hover:border-blue-400 transition-colors bg-slate-50/50">
            <div className="h-12 w-12 rounded-2xl bg-blue-100 text-blue-600 mx-auto flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Upload an Audio Track from Your Computer</p>
              <p className="text-xs text-slate-500 mt-1">Supports MP3, WAV, AAC, and FLAC files</p>
            </div>
            <label className="inline-flex cursor-pointer">
              <span className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors">
                Browse Audio Files
              </span>
              <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        )}
      </div>
    </Modal>
  );
}
