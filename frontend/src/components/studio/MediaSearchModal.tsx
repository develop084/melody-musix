import React, { useState, useEffect, useRef } from 'react';
import { mediaApi } from '../../api/media';
import { MediaTrack } from '../../types';
import { audioEngine } from '../../audio/audioEngine';
import { useStudioStore } from '../../stores/studioStore';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Tabs } from '../ui/Tabs';
import {
  Search,
  Music,
  Upload,
  Play,
  Square,
  Loader2,
  Plus,
} from 'lucide-react';

interface MediaSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

const SUGGESTED_SEARCH_CHIPS = [
  'Bollywood',
  'Lo-Fi Chill',
  'Punjabi Dhol',
  'Acoustic Guitar',
  'Bhakti Flute',
  'Hip-Hop',
  'Sufi',
];

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

  const executeSearch = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    setError(null);
    try {
      const data = await mediaApi.search(query);
      setResults(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to search YouTube media');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await executeSearch(searchQuery);
  };

  const handleChipClick = async (chipText: string) => {
    setSearchQuery(chipText);
    await executeSearch(chipText);
  };

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
    } catch {
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
    } catch {
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
      title="Import Audio"
      description="Search YouTube, audition preset sounds, or upload an audio file to trim and arrange"
      maxWidth="2xl"
      featuredIcon={<Music className="w-5 h-5 text-slate-700" />}
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Tabs
            tabs={[
              { id: 'youtube', label: 'YouTube Search', icon: <Search className="w-3.5 h-3.5" /> },
              {
                id: 'samples',
                label: 'Sound Presets',
                count: samples.length || 9,
                icon: <Music className="w-3.5 h-3.5 text-slate-500" />,
              },
              { id: 'upload', label: 'Upload File', icon: <Upload className="w-3.5 h-3.5" /> },
            ]}
            activeTab={tab}
            onChange={(id) => setTab(id as any)}
            size="sm"
          />
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Tab 1: YouTube Search */}
        {tab === 'youtube' && (
          <div className="space-y-3">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder="Search songs, artists, or paste YouTube URL..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 text-xs"
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
                autoFocus
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSearching}
                className="shrink-0"
              >
                Search
              </Button>
            </form>

            {/* Quick Search Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-slate-500 mr-1 font-medium">
                Suggested:
              </span>
              {SUGGESTED_SEARCH_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleChipClick(chip)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg bg-white shadow-xs">
              {results.length === 0 && !isSearching && (
                <div className="text-center py-10 text-slate-500 text-xs space-y-1">
                  <p className="font-medium text-slate-700">Search for audio or pick a suggested topic above</p>
                  <p className="text-slate-400">
                    Audio stream will be loaded into the trimmer for editing
                  </p>
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
                        className="w-14 h-10 object-cover rounded-md shrink-0 bg-slate-100 border border-slate-200"
                      />
                    ) : (
                      <div className="w-14 h-10 rounded-md bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                        <Music className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">{track.title}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {track.author} • {track.duration}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => handlePreview(track)}
                      disabled={loadingAudioId === track.id}
                      className="h-8 px-2.5"
                      title="Audition"
                    >
                      {loadingAudioId === track.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-700" />
                      ) : previewingId === track.id ? (
                        <Square className="w-3.5 h-3.5 text-rose-600 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current text-slate-700" />
                      )}
                    </Button>
                    <Button
                      variant="primary"
                      size="xs"
                      onClick={() => handleSelectTrack(track)}
                      className="h-8"
                      leftIcon={<Plus className="w-3.5 h-3.5" />}
                    >
                      Import
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Factory Loops */}
        {tab === 'samples' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-600">
                Preset loops ready to drop into your arrangement:
              </p>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg bg-white shadow-xs">
              {samples.map((track) => (
                <div
                  key={track.id}
                  className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={track.thumbnail}
                      alt=""
                      className="w-14 h-10 object-cover rounded-md shrink-0 bg-slate-100 border border-slate-200"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">{track.title}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {track.author} • {track.duration}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => handlePreview(track)}
                      disabled={loadingAudioId === track.id}
                      className="h-8 px-2.5"
                    >
                      {loadingAudioId === track.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-700" />
                      ) : previewingId === track.id ? (
                        <Square className="w-3.5 h-3.5 text-rose-600 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current text-slate-700" />
                      )}
                    </Button>
                    <Button
                      variant="primary"
                      size="xs"
                      onClick={() => handleSelectTrack(track)}
                      className="h-8"
                      leftIcon={<Plus className="w-3.5 h-3.5" />}
                    >
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
          <div className="p-8 border-2 border-dashed border-slate-300 rounded-lg text-center space-y-4 hover:border-slate-400 transition-colors bg-slate-50">
            <div className="h-12 w-12 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 mx-auto flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Upload Audio File</p>
              <p className="text-xs text-slate-500 mt-1">
                Supports MP3, WAV, AAC, and FLAC
              </p>
            </div>
            <label className="inline-flex cursor-pointer">
              <span className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors">
                Choose File
              </span>
              <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        )}
      </div>
    </Modal>
  );
}
